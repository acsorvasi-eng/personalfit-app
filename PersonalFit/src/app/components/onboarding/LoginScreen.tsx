/**
 * LoginScreen - Local name-only sign-in
 * No email, no password, no cloud. Everything stays on device.
 * MVP flow: enter your name → navigate to profile setup wizard.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { User, ArrowRight, Loader2, Lock, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DSMButton } from '../dsm';

export function LoginScreen() {
  const navigate = useNavigate();
  const { loginLocal, isAuthenticated, isLoading, getNextRoute } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Already logged in → skip
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    const target = getNextRoute();
    if (target && target !== '/login') navigate(target, { replace: true });
  }, [isAuthenticated, isLoading, getNextRoute, navigate]);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await loginLocal(trimmed);
      navigate('/profile-setup', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top spacer */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-sm mx-auto w-full">

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
            <User className="w-10 h-10 text-primary" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 350, damping: 28 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {t('login.heading')}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {t('login.subheading')}
          </p>
        </motion.div>

        {/* Name input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full space-y-4"
        >
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('login.placeholder')}
              maxLength={40}
              className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-border bg-background text-foreground text-base placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <DSMButton type="submit" variant="primary" disabled={!name.trim() || isSubmitting} className="w-full h-14 rounded-2xl">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            <span>{isSubmitting ? t('login.loading') : t('login.next')}</span>
          </DSMButton>
        </motion.form>

        {/* Privacy badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-2 w-full"
        >
          {[
            { icon: Lock, text: t('login.privacy1') },
            { icon: Smartphone, text: t('login.privacy2') },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-gray-400">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
