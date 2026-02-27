/**
 * FAQPage - Gyakran Ismételt Kérdések / FAQ / Întrebări frecvente
 * Fully localized via useLanguage hook.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { HelpCircle, ChevronDown } from "lucide-react";
import { DSMSubPageHeader } from "./dsm";
import { useLanguage } from "../contexts/LanguageContext";

export function FAQPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Build FAQ data from translations
  const FAQ_DATA = [
    {
      category: t("faq.catGeneral"),
      items: [
        { q: t("faq.q1_1"), a: t("faq.a1_1") },
        { q: t("faq.q1_2"), a: t("faq.a1_2") },
        { q: t("faq.q1_3"), a: t("faq.a1_3") },
      ]
    },
    {
      category: t("faq.catDiet"),
      items: [
        { q: t("faq.q2_1"), a: t("faq.a2_1") },
        { q: t("faq.q2_2"), a: t("faq.a2_2") },
        { q: t("faq.q2_3"), a: t("faq.a2_3") },
      ]
    },
    {
      category: t("faq.catShopping"),
      items: [
        { q: t("faq.q3_1"), a: t("faq.a3_1") },
        { q: t("faq.q3_2"), a: t("faq.a3_2") },
      ]
    },
    {
      category: t("faq.catWorkout"),
      items: [
        { q: t("faq.q4_1"), a: t("faq.a4_1") },
        { q: t("faq.q4_2"), a: t("faq.a4_2") },
      ]
    },
    {
      category: t("faq.catAccount"),
      items: [
        { q: t("faq.q5_1"), a: t("faq.a5_1") },
        { q: t("faq.q5_2"), a: t("faq.a5_2") },
      ]
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <DSMSubPageHeader
          title={t("faq.title")}
          subtitle={t("faq.subtitle")}
          onBack={() => navigate('/profile')}
          gradientFrom="from-emerald-500"
          gradientTo="to-teal-600"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-4 space-y-5">
        {FAQ_DATA.map((section) => (
          <div key={section.category}>
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-emerald-500" />
              <h3 className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700 }}>{section.category}</h3>
            </div>
            <div className="space-y-2">
              {section.items.map((item, idx) => {
                const key = `${section.category}-${idx}`;
                const isOpen = openItems[key];
                return (
                  <div
                    key={key}
                    className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200 pr-3" style={{ fontWeight: 600 }}>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3.5 border-t border-gray-50 dark:border-[#2a2a2a]">
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-3">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="text-center py-6">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t("faq.notFoundAnswer")}
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="mt-2 text-xs text-emerald-600 dark:text-emerald-400"
            style={{ fontWeight: 600 }}
          >
            {t("faq.contactLink")}
          </button>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
