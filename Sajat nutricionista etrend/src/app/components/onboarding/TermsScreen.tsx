/**
 * TermsScreen - Terms & Conditions
 * User must check the agreement checkbox before proceeding.
 * Handles the case where user declines T&C.
 * Fully localized via useLanguage hook.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronRight,
  Shield,
  Lock,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent } from '../ui/card';

export function TermsScreen() {
  const navigate = useNavigate();
  const { markTermsAccepted, logout } = useAuth();
  const { t } = useLanguage();
  const [isAccepted, setIsAccepted] = useState(false);
  const [showDeclineWarning, setShowDeclineWarning] = useState(false);

  // Build sections from translations
  const TERMS_SECTIONS = [
    { title: t("terms.sec1Title"), content: t("terms.sec1Content") },
    { title: t("terms.sec2Title"), content: t("terms.sec2Content") },
    { title: t("terms.sec3Title"), content: t("terms.sec3Content") },
    { title: t("terms.sec4Title"), content: t("terms.sec4Content") },
    { title: t("terms.sec5Title"), content: t("terms.sec5Content") },
    { title: t("terms.sec6Title"), content: t("terms.sec6Content") },
    { title: t("terms.sec7Title"), content: t("terms.sec7Content") },
    { title: t("terms.sec8Title"), content: t("terms.sec8Content") },
  ];

  const handleAcceptAndContinue = () => {
    if (!isAccepted) return;
    markTermsAccepted();
    // Go straight to the app — subscription is handled from Profile
    navigate('/');
  };

  const handleDecline = () => {
    setShowDeclineWarning(true);
  };

  const handleConfirmDecline = () => {
    // User explicitly declined T&C - log them out
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-[#121212] dark:via-[#121212] dark:to-[#121212] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-8 pb-4"
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl text-gray-900">{t("terms.title")}</h1>
              <p className="text-gray-500 text-sm">{t("terms.subtitle")}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scrollable T&C Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex-1 overflow-y-auto px-6 pb-4"
      >
        <div className="max-w-md mx-auto">
          {/* Trust Badges */}
          <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700">
              <Shield className="w-4 h-4" />
              <span className="text-xs">{t("terms.gdpr")}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700">
              <Lock className="w-4 h-4" />
              <span className="text-xs">{t("terms.encrypted")}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700">
              <Eye className="w-4 h-4" />
              <span className="text-xs">{t("terms.transparent")}</span>
            </div>
          </div>

          {/* T&C Sections */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-5 pt-5 space-y-5">
              {TERMS_SECTIONS.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-gray-900 mb-1.5">{section.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {section.content}
                  </p>
                  {idx < TERMS_SECTIONS.length - 1 && (
                    <div className="border-b border-gray-100 mt-4" />
                  )}
                </div>
              ))}

              <p className="text-xs text-gray-400 pt-2">
                {t("terms.lastUpdate")}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Fixed Bottom - Acceptance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border-t border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1E1E1E] px-6 py-5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      >
        <div className="max-w-md mx-auto space-y-4">
          {/* Decline Warning */}
          {showDeclineWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    {t("terms.declineWarning")}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeclineWarning(false)}
                      className="text-xs"
                    >
                      {t("terms.cancelBtn")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleConfirmDecline}
                      className="text-xs"
                    >
                      {t("terms.declineBtn")}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms-accept"
              checked={isAccepted}
              onCheckedChange={(checked) => {
                setIsAccepted(checked === true);
                setShowDeclineWarning(false);
              }}
              className="mt-0.5"
            />
            <label htmlFor="terms-accept" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
              {t("terms.acceptCheckbox")}
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDecline}
              className="flex-1 h-12 rounded-xl border-gray-200"
            >
              {t("terms.declineBtn")}
            </Button>
            <Button
              onClick={handleAcceptAndContinue}
              disabled={!isAccepted}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 text-white border-0 shadow-lg gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("terms.acceptBtn")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}