import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useLanguage } from '../../../contexts/LanguageContext';

export interface ProgressChartProps {
  currentWeight: number;
  snapshots: Array<{
    day: number;
    date: string;
    predictedWeight: number;
  }>;
  targetWeight?: number;
  milestones: {
    weightAt30Days?: number;
    weightAt60Days?: number;
    weightAt90Days?: number;
    targetReachDate?: string | null;
  };
}

export function ProgressChart({
  currentWeight,
  snapshots,
  targetWeight,
  milestones,
}: ProgressChartProps) {
  const { t } = useLanguage();

  const hasTargetReach =
    targetWeight != null &&
    milestones.targetReachDate != null &&
    milestones.targetReachDate.length > 0;

  return (
    <div
      className="rounded-[1.5rem] p-6 shadow-sm"
      style={{
        backgroundColor: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="mb-1 font-semibold text-gray-900">
        {t('profile.progressChartTitle')}
      </div>
      <div className="mb-4 text-sm text-gray-500">
        {t('profile.progressChartSubtitle')}
      </div>

      <div className="mb-2 text-sm font-bold text-gray-800">
        {t('profile.currentWeight')}: {currentWeight.toFixed(1)} kg
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={snapshots}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={[30, 60, 90]}
            tickFormatter={(day) => {
              if (day === 30) return t('profile.progressChartDay30');
              if (day === 60) return t('profile.progressChartDay60');
              if (day === 90) return t('profile.progressChartDay90');
              return '';
            }}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '12px',
              padding: '8px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number) => [`${Number(value).toFixed(1)} kg`, '']}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload;
              return p?.date ?? '';
            }}
          />
          {targetWeight != null && (
            <ReferenceLine
              y={targetWeight}
              stroke="#9ca3af"
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
          )}
          <Line
            type="monotone"
            dataKey="predictedWeight"
            stroke="url(#progressGradient)"
            strokeWidth={2.5}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div
          className="rounded-lg py-3 text-center text-sm"
          style={{ backgroundColor: '#f9fafb' }}
        >
          <div className="text-gray-500">{t('profile.progressChartDay30')}</div>
          <div className="mt-0.5 font-semibold text-gray-900">
            {milestones.weightAt30Days != null
              ? `${milestones.weightAt30Days.toFixed(1)} kg`
              : '–'}
          </div>
        </div>
        <div
          className="rounded-lg py-3 text-center text-sm"
          style={{ backgroundColor: '#f9fafb' }}
        >
          <div className="text-gray-500">{t('profile.progressChartDay60')}</div>
          <div className="mt-0.5 font-semibold text-gray-900">
            {milestones.weightAt60Days != null
              ? `${milestones.weightAt60Days.toFixed(1)} kg`
              : '–'}
          </div>
        </div>
        <div
          className="rounded-lg py-3 text-center text-sm"
          style={{ backgroundColor: '#f9fafb' }}
        >
          <div className="text-gray-500">{t('profile.progressChartDay90')}</div>
          <div className="mt-0.5 font-semibold text-gray-900">
            {milestones.weightAt90Days != null
              ? `${milestones.weightAt90Days.toFixed(1)} kg`
              : '–'}
          </div>
        </div>
      </div>

      {hasTargetReach && (
        <p className="mt-4 text-center text-sm font-medium text-green-600">
          {t('profile.progressChartTargetReach').replace(
            '{date}',
            milestones.targetReachDate ?? ''
          )}
        </p>
      )}
    </div>
  );
}
