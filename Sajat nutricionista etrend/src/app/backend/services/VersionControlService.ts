/**
 * ====================================================================
 * Version Control Service
 * ====================================================================
 * Manages versioning for NutritionPlan, TrainingPlan, MeasurementProfile.
 *
 * Rules:
 *   - Each upload creates a new version
 *   - Old versions are kept
 *   - One active version per entity type
 *   - Allows manual deletion (not automatic overwrite)
 */

import { getDB, generateId, nowISO, notifyDBChange } from '../db';
import type { VersionRecord, VersionableEntityType } from '../models';

// ═══════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════

export async function getVersionsForEntity(
  entityType: VersionableEntityType
): Promise<VersionRecord[]> {
  const db = await getDB();
  const results = await db.getAllFromIndex<VersionRecord>('versions', 'by-entity-type', entityType);
  return results.sort((a, b) => b.version - a.version);
}

export async function getActiveVersion(
  entityType: VersionableEntityType
): Promise<VersionRecord | undefined> {
  const db = await getDB();
  const results = await db.getAllFromIndex<VersionRecord>(
    'versions', 'by-type-active', [entityType, true]
  );
  return results[0];
}

export async function getVersionById(id: string): Promise<VersionRecord | undefined> {
  const db = await getDB();
  return db.get<VersionRecord>('versions', id);
}

export async function getVersionHistory(entityId: string): Promise<VersionRecord[]> {
  const db = await getDB();
  const results = await db.getAllFromIndex<VersionRecord>('versions', 'by-entity-id', entityId);
  return results.sort((a, b) => b.version - a.version);
}

// ═══════════════════════════════════════════════════════════════
// CREATE VERSION
// ═══════════════════════════════════════════════════════════════

export async function createVersion(input: {
  entity_type: VersionableEntityType;
  entity_id: string;
  label: string;
  metadata?: Record<string, any>;
}): Promise<VersionRecord> {
  const existing = await getVersionsForEntity(input.entity_type);
  const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

  const now = nowISO();
  const record: VersionRecord = {
    id: generateId(),
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    version: nextVersion,
    is_active: false,
    label: input.label,
    snapshot_date: now,
    metadata: input.metadata || {},
    created_at: now,
  };

  const db = await getDB();
  await db.put('versions', record);
  notifyDBChange({ store: 'versions', action: 'put', key: record.id });
  return record;
}

// ═══════════════════════════════════════════════════════════════
// ACTIVATE VERSION
// ═══════════════════════════════════════════════════════════════

export async function activateVersion(versionId: string): Promise<void> {
  const db = await getDB();
  const target = await db.get<VersionRecord>('versions', versionId);
  if (!target) throw new Error(`Verzió nem található: ${versionId}`);

  const allOfType = await db.getAllFromIndex<VersionRecord>(
    'versions', 'by-entity-type', target.entity_type
  );

  for (const record of allOfType) {
    const wasActive = record.is_active;
    record.is_active = record.id === versionId;
    if (record.is_active !== wasActive) {
      await db.put('versions', record);
    }
  }

  notifyDBChange({ store: 'versions', action: 'put', key: versionId });
}

// ═══════════════════════════════════════════════════════════════
// DELETE VERSION
// ═══════════════════════════════════════════════════════════════

export async function deleteVersion(versionId: string): Promise<void> {
  const db = await getDB();
  const record = await db.get<VersionRecord>('versions', versionId);
  if (!record) throw new Error(`Verzió nem található: ${versionId}`);

  if (record.is_active) {
    throw new Error('Aktív verzió nem törölhető. Aktiválj előbb másik verziót.');
  }

  await db.delete('versions', versionId);
  notifyDBChange({ store: 'versions', action: 'delete', key: versionId });
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

export async function getVersionSummary(entityType: VersionableEntityType): Promise<{
  total_versions: number;
  active_version: number | null;
  active_label: string | null;
  latest_date: string | null;
}> {
  const versions = await getVersionsForEntity(entityType);
  const active = versions.find(v => v.is_active);

  return {
    total_versions: versions.length,
    active_version: active?.version ?? null,
    active_label: active?.label ?? null,
    latest_date: versions.length > 0 ? versions[0].snapshot_date : null,
  };
}
