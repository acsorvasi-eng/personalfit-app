/**
 * ContactPage - Contact page (localized)
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, MessageCircle, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { DSMSubPageHeader, DSMCard, DSMSectionTitle, DSMButton } from "./dsm";
import { useLanguage } from "../contexts/LanguageContext";

export function ContactPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulated submission
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <DSMSubPageHeader
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
          onBack={() => navigate('/profile')}
          gradientFrom="from-blue-500"
          gradientTo="to-emerald-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
        {/* Contact Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <ContactInfoCard
            icon={Mail}
            iconColor="text-blue-500"
            bg="bg-blue-50 dark:bg-blue-500/10"
            label="E-mail"
            value="info@etrendterv.hu"
          />
          <ContactInfoCard
            icon={MapPin}
            iconColor="text-emerald-500"
            bg="bg-emerald-50 dark:bg-emerald-500/10"
            label={t('contact.locationLabel')}
            value={t('contact.locationValue')}
          />
          <ContactInfoCard
            icon={Clock}
            iconColor="text-amber-500"
            bg="bg-amber-50 dark:bg-amber-500/10"
            label={t('contact.responseTimeLabel')}
            value={t('contact.responseTimeValue')}
          />
          <ContactInfoCard
            icon={MessageCircle}
            iconColor="text-purple-500"
            bg="bg-purple-50 dark:bg-purple-500/10"
            label={t('contact.languageLabel')}
            value={t('contact.languageValue')}
          />
        </div>

        {/* Contact Form */}
        <DSMCard>
          <DSMSectionTitle icon={Send} iconColor="text-blue-500" title={t('contact.sendMessage')} className="mb-4" />

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 mb-1" style={{ fontWeight: 700 }}>{t('contact.messageSent')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('contact.willReply')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">{t('contact.nameLabel')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('contact.namePlaceholder')}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a2a2a] rounded-xl text-sm bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pelda@email.com"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a2a2a] rounded-xl text-sm bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">{t('contact.subjectLabel')}</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a2a2a] rounded-xl text-sm bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500"
                >
                  <option value="">{t('contact.selectTopic')}</option>
                  <option value="general">{t('contact.general')}</option>
                  <option value="bug">{t('contact.bugReport')}</option>
                  <option value="feature">{t('contact.featureRequest')}</option>
                  <option value="subscription">{t('contact.subscriptionRelated')}</option>
                  <option value="diet">{t('contact.dietAdvice')}</option>
                  <option value="other">{t('contact.other')}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">{t('contact.messageLabel')}</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t('contact.messagePlaceholder')}
                  required
                  rows={4}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-[#2a2a2a] rounded-xl text-sm bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 resize-none"
                />
              </div>
              <DSMButton variant="gradient" size="md" fullWidth icon={Send} type="submit">
                {t('contact.submitBtn')}
              </DSMButton>
            </form>
          )}
        </DSMCard>

        <div className="text-center py-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {t('contact.demoNote')}
          </p>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function ContactInfoCard({ icon: Icon, iconColor, bg, label, value }: {
  icon: React.ElementType; iconColor: string; bg: string; label: string; value: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-3.5 text-center">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className="text-xs text-gray-900 dark:text-gray-200" style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
