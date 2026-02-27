/**
 * ====================================================================
 * Pipeline Diagnostics Agent
 * ====================================================================
 * Floating diagnostic overlay that monitors the data pipeline health.
 * Shows real-time IndexedDB store counts and pipeline status.
 *
 * Enable: Add ?diagnostics=1 to URL or tap the invisible corner 5x.
 * This component is NON-DESTRUCTIVE — read-only checks only.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDB } from '../backend/db';
import type { StoreName } from '../backend/db';
import { Activity, Database, ChevronDown, ChevronUp, X, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

import { useLanguage, getLocale } from '../contexts/LanguageContext';

interface StoreHealth {
  name: StoreName;
  count: number;
  status: 'ok' | 'empty' | 'warning';
  label: string;
}

interface PipelineCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn' | 'checking';
  detail: string;
}

export function PipelineDiagnostics() {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false); // Enable via ?diagnostics=1 or 5 taps on top-right corner
  const [isExpanded, setIsExpanded] = useState(true);
  const [stores, setStores] = useState<StoreHealth[]>([]);
  const [checks, setChecks] = useState<PipelineCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Activation: ?diagnostics=1 OR 5 taps on corner
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('diagnostics') === '1') {
      setIsVisible(true);
    }
  }, []);

  const handleCornerTap = useCallback(() => {
    tapCountRef.current++;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    if (tapCountRef.current >= 5) {
      setIsVisible(prev => !prev);
      tapCountRef.current = 0;
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    const newChecks: PipelineCheck[] = [];

    try {
      const db = await getDB();

      // ─── Store Health ─────────────────────────
      const storeNames: { name: StoreName; label: string; criticalMin: number }[] = [
        { name: 'foods', label: 'Elelmiszerek', criticalMin: 1 },
        { name: 'nutrition_plans', label: 'Etrend tervek', criticalMin: 0 },
        { name: 'meal_days', label: 'Etkez. napok', criticalMin: 0 },
        { name: 'meals', label: 'Etkezesek', criticalMin: 0 },
        { name: 'meal_items', label: 'Osszetevok', criticalMin: 0 },
        { name: 'shopping_list', label: 'Bev. lista', criticalMin: 0 },
        { name: 'measurements', label: 'Meresek', criticalMin: 0 },
        { name: 'training_plans', label: 'Edzes tervek', criticalMin: 0 },
        { name: 'versions', label: 'Verziok', criticalMin: 0 },
      ];

      const storeResults: StoreHealth[] = [];
      for (const s of storeNames) {
        const count = await db.count(s.name);
        storeResults.push({
          name: s.name,
          count,
          status: count === 0 ? (s.criticalMin > 0 ? 'warning' : 'empty') : 'ok',
          label: s.label,
        });
      }
      setStores(storeResults);

      // ─── Pipeline Checks ──────────────────────

      // Check 1: Foods exist
      const foodCount = await db.count('foods');
      newChecks.push({
        id: 'foods-exist',
        label: 'Elelmiszerek leteznek',
        status: foodCount > 0 ? 'pass' : 'fail',
        detail: `${foodCount} elem az adatbazisban`,
      });

      // Check 2: Active plan exists
      const plans = await db.getAll('nutrition_plans');
      const activePlan = plans.find((p: any) => p.is_active);
      newChecks.push({
        id: 'active-plan',
        label: 'Aktiv etrend terv',
        status: activePlan ? 'pass' : 'fail',
        detail: activePlan ? `"${(activePlan as any).label}" (${(activePlan as any).id.substring(0, 8)}...)` : 'Nincs aktiv terv',
      });

      // Check 3: Plan has meal days
      if (activePlan) {
        const mealDays = await db.getAllFromIndex('meal_days', 'by-plan', (activePlan as any).id);
        newChecks.push({
          id: 'meal-days',
          label: 'Etkez. napok az aktiv tervben',
          status: mealDays.length > 0 ? 'pass' : 'fail',
          detail: `${mealDays.length} nap`,
        });

        // Check 4: Plan has meals
        const meals = await db.getAllFromIndex('meals', 'by-plan', (activePlan as any).id);
        newChecks.push({
          id: 'meals',
          label: 'Etkezesek az aktiv tervben',
          status: meals.length > 0 ? 'pass' : 'fail',
          detail: `${meals.length} etkez.`,
        });

        // Check 5: Meals have items
        let totalItems = 0;
        let emptyMeals = 0;
        for (const meal of meals) {
          const items = await db.getAllFromIndex('meal_items', 'by-meal', (meal as any).id);
          totalItems += items.length;
          if (items.length === 0) emptyMeals++;
        }
        newChecks.push({
          id: 'meal-items',
          label: 'Osszeteok az etkezesekben',
          status: totalItems > 0 ? (emptyMeals > 0 ? 'warn' : 'pass') : 'fail',
          detail: `${totalItems} osszetevo, ${emptyMeals} ures etkez.`,
        });

        // Check 6: MealItems reference valid foods
        const allMealItems = await db.getAll('meal_items');
        let orphanedItems = 0;
        for (const item of allMealItems) {
          const food = await db.get('foods', (item as any).food_id);
          if (!food) orphanedItems++;
        }
        newChecks.push({
          id: 'food-refs',
          label: 'Elelmiszer hivatkozasok epek',
          status: orphanedItems === 0 ? 'pass' : 'warn',
          detail: orphanedItems > 0 ? `${orphanedItems} arva hivatkozas` : `Mind a ${allMealItems.length} elelmiszer rendben`,
        });
      } else {
        newChecks.push({
          id: 'meal-days',
          label: 'Etkez. napok',
          status: 'fail',
          detail: 'Nincs aktiv terv — nem ellenorizheto',
        });
      }

      // Check 7: Staging state
      const stagingRaw = localStorage.getItem('uploadStaging');
      if (stagingRaw) {
        try {
          const staging = JSON.parse(stagingRaw);
          newChecks.push({
            id: 'staging',
            label: 'Staging allapot',
            status: staging.state === 'active' ? 'pass' : 'warn',
            detail: `${staging.state} — "${staging.label}"`,
          });
        } catch {
          newChecks.push({
            id: 'staging',
            label: 'Staging allapot',
            status: 'fail',
            detail: 'Ervenytelen staging adat',
          });
        }
      } else {
        newChecks.push({
          id: 'staging',
          label: 'Staging allapot',
          status: 'warn',
          detail: 'Nincs staging adat',
        });
      }

      // Check 8: User profile
      const profileRaw = localStorage.getItem('userProfile');
      if (profileRaw) {
        try {
          const profile = JSON.parse(profileRaw);
          const fields = Object.entries(profile).filter(([, v]) => v && v !== 0 && v !== '').length;
          newChecks.push({
            id: 'profile',
            label: 'Felhasznaloi profil',
            status: fields > 2 ? 'pass' : 'warn',
            detail: `${fields} kitoltott mezo`,
          });
        } catch {
          newChecks.push({
            id: 'profile',
            label: 'Felhasznaloi profil',
            status: 'fail',
            detail: 'Ervenytelen profil adat',
          });
        }
      } else {
        newChecks.push({
          id: 'profile',
          label: 'Felhasznaloi profil',
          status: 'warn',
          detail: 'Nincs letrehozva',
        });
      }

    } catch (error) {
      newChecks.push({
        id: 'db-error',
        label: 'IndexedDB hozzaferes',
        status: 'fail',
        detail: `Hiba: ${error instanceof Error ? error.message : 'Ismeretlen'}`,
      });
    }

    setChecks(newChecks);
    setIsRunning(false);
    setLastRun(new Date().toLocaleTimeString(getLocale(language)));
  }, [language]);

  // Auto-run on open
  useEffect(() => {
    if (isVisible) {
      runDiagnostics();
    }
  }, [isVisible, runDiagnostics]);

  // Auto-refresh every 5 seconds when visible and expanded
  useEffect(() => {
    if (!isVisible || !isExpanded) return;
    const interval = setInterval(runDiagnostics, 5000);
    return () => clearInterval(interval);
  }, [isVisible, isExpanded, runDiagnostics]);

  if (!isVisible) {
    // Invisible activation zone
    return (
      <div
        className="fixed top-0 right-0 w-12 h-12 z-[9999]"
        onClick={handleCornerTap}
      />
    );
  }

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass';

  return (
    <div className="fixed top-2 right-2 z-[9999] w-[340px] bg-gray-950/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl text-white overflow-hidden" style={{ fontSize: '12px' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${overallStatus === 'pass' ? 'text-emerald-400' : overallStatus === 'warn' ? 'text-amber-400' : 'text-red-400'}`} />
          <span className="font-mono tracking-tight">Pipeline Diagnostics</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400 font-mono">
            {passCount}P {failCount}F {warnCount}W
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); runDiagnostics(); }}
            className="p-1 hover:bg-gray-700/50 rounded"
          >
            <RefreshCw className={`w-3 h-3 text-gray-400 ${isRunning ? 'animate-spin' : ''}`} />
          </button>
          {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
          <button
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            className="p-1 hover:bg-gray-700/50 rounded"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-800">
          {/* Store Counts */}
          <div className="px-3 py-2 border-b border-gray-800/50">
            <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
              <Database className="w-3 h-3" /> IndexedDB Store Counts
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
              {stores.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-gray-400 truncate" style={{ maxWidth: '65px' }}>{s.label}</span>
                  <span className={`font-mono ${
                    s.status === 'ok' ? 'text-emerald-400' :
                    s.status === 'warning' ? 'text-red-400' : 'text-gray-600'
                  }`}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Checks */}
          <div className="px-3 py-2">
            <div className="text-[10px] text-gray-500 mb-1">Pipeline Checks</div>
            <div className="space-y-1">
              {checks.map(c => (
                <div key={c.id} className="flex items-start gap-1.5">
                  {c.status === 'pass' && <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />}
                  {c.status === 'fail' && <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />}
                  {c.status === 'warn' && <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />}
                  {c.status === 'checking' && <RefreshCw className="w-3 h-3 text-blue-400 mt-0.5 shrink-0 animate-spin" />}
                  <div className="min-w-0">
                    <div className={`${
                      c.status === 'pass' ? 'text-emerald-300' :
                      c.status === 'fail' ? 'text-red-300' :
                      c.status === 'warn' ? 'text-amber-300' : 'text-gray-300'
                    }`}>
                      {c.label}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          {lastRun && (
            <div className="px-3 py-1 border-t border-gray-800/50 text-[10px] text-gray-600 text-right">
              Utolso futtatas: {lastRun}
            </div>
          )}
        </div>
      )}
    </div>
  );
}