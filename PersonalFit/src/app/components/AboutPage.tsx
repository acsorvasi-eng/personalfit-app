/**
 * AboutPage - About page (localized)
 */

import { useNavigate } from "react-router";
import { Heart, Shield, Leaf, Users, Sparkles } from "lucide-react";
import { DSMSubPageHeader, DSMCard, DSMSectionTitle } from "./dsm";
import { useLanguage } from "../contexts/LanguageContext";

export function AboutPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const TEAM_VALUES = [
    {
      icon: Heart,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-500/10",
      title: t('about.healthFirst'),
      desc: t('about.healthFirstDesc')
    },
    {
      icon: Shield,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      title: t('about.privacy'),
      desc: t('about.privacyDesc')
    },
    {
      icon: Leaf,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      title: t('about.sustainability'),
      desc: t('about.sustainabilityDesc')
    },
    {
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-500/10",
      title: t('about.community'),
      desc: t('about.communityDesc')
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <DSMSubPageHeader
          title={t('about.title')}
          subtitle={t('about.subtitle')}
          onBack={() => navigate('/profile')}
          gradientFrom="from-teal-500"
          gradientTo="to-emerald-600"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
        {/* Mission */}
        <DSMCard>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>{t('about.missionTitle')}</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('about.missionText')}
          </p>
        </DSMCard>

        {/* App Info */}
        <DSMCard>
          <DSMSectionTitle title={t('about.appInfoTitle')} iconColor="text-emerald-600" className="mb-3" />
          <div className="space-y-3">
            <InfoRow label={t('about.versionLabel')} value="2.0.26 (2026)" />
            <InfoRow label={t('about.platformLabel')} value="React 18 + TypeScript" />
            <InfoRow label={t('about.regionLabel')} value={t('about.regionValue')} />
            <InfoRow label={t('about.languageLabel')} value={t('about.languageValue')} />
            <InfoRow label={t('about.foodDbLabel')} value={t('about.foodDbValue')} />
            <InfoRow label={t('about.currencyLabel')} value={t('about.currencyValue')} />
          </div>
        </DSMCard>

        {/* Values */}
        <DSMCard>
          <DSMSectionTitle title={t('about.valuesTitle')} iconColor="text-emerald-600" className="mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEAM_VALUES.map((val) => (
              <div key={val.title} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#252525] rounded-xl">
                <div className={`w-9 h-9 ${val.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <val.icon className={`w-4.5 h-4.5 ${val.color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>{val.title}</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{val.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DSMCard>

        {/* Tech Stack */}
        <DSMCard>
          <DSMSectionTitle title={t('about.techTitle')} iconColor="text-blue-600" className="mb-3" />
          <div className="flex flex-wrap gap-2">
            {['React 18', 'TypeScript', 'Tailwind CSS v4', 'Motion', 'Lucide Icons', 'Recharts', 'LocalStorage', 'PWA Ready'].map(tech => (
              <span key={tech} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-[11px]" style={{ fontWeight: 600 }}>
                {tech}
              </span>
            ))}
          </div>
        </DSMCard>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('about.footer')}
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
            {t('about.copyright')}
          </p>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-200" style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
