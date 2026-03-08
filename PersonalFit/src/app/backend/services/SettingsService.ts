/**
 * SettingsService — key-value persistence via IndexedDB 'settings' store.
 * Key-value persistence for app settings, flags, and session data.
 */

import { getDB } from '../db';

export interface SettingRecord {
  id: string;
  value: string;
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    const record = await db.get<SettingRecord>('settings', key);
    return record?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', { id: key, value });
}

export async function removeSetting(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('settings', key);
  } catch {
    // ignore
  }
}

export async function clearAllSettings(): Promise<void> {
  const db = await getDB();
  await db.clear('settings');
}

export async function getSettingKeys(): Promise<string[]> {
  const db = await getDB();
  const records = await db.getAll<SettingRecord>('settings');
  return records.map((r) => r.id);
}
