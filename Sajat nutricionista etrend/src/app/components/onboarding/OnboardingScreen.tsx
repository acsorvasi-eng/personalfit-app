/**
 * OnboardingScreen - 4-slide introduction to app benefits
 * Uses swipe/tap navigation with progress dots.
 * Connects to the AuthContext flow.
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  ShoppingCart,
  Dumbbell,
  Heart,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface OnboardingSlide {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  titleKey: string;
  subtitleKey: string;
  descKey: string;
  image: string;
  gradient: string;
  features?: { key1: string; key2: string };
}

const slides: OnboardingSlide[] = [
  {
    icon: UtensilsCrossed,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    titleKey: 'onboarding.slide1.title',
    subtitleKey: 'onboarding.slide1.subtitle',
    descKey: 'onboarding.slide1.desc',
    image: 'https://images.unsplash.com/photo-1621758745802-6c16a087ca32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwbWVhbCUyMHBsYW5uaW5nJTIwbnV0cml0aW9ufGVufDF8fHx8MTc3MTMxOTE5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gradient: 'from-blue-500 via-blue-500 to-teal-500',
  },
  {
    icon: ShoppingCart,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
    titleKey: 'onboarding.slide2.title',
    subtitleKey: 'onboarding.slide2.subtitle',
    descKey: 'onboarding.slide2.desc',
    image: 'https://images.unsplash.com/photo-1703113691184-848da8ebd0bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm9jZXJ5JTIwc2hvcHBpbmclMjBmcmVzaCUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzcxMjcwOTAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gradient: 'from-blue-500 via-blue-500 to-teal-500',
  },
  {
    icon: Dumbbell,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100 dark:bg-orange-500/20',
    titleKey: 'onboarding.slide3.title',
    subtitleKey: 'onboarding.slide3.subtitle',
    descKey: 'onboarding.slide3.desc',
    image: 'https://images.unsplash.com/photo-1758875568756-37a9c5c1a4f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwd29ya291dCUyMHRyYWNraW5nJTIwcHJvZ3Jlc3N8ZW58MXx8fHwxNzcxMzE5MTk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gradient: 'from-orange-500 via-pink-500 to-rose-500',
  },
  {
    icon: Heart,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    titleKey: 'onboarding.slide4.title',
    subtitleKey: 'onboarding.slide4.subtitle',
    descKey: 'onboarding.slide4.desc',
    image: '',
    gradient: 'from-rose-500 via-purple-500 to-indigo-500',
    features: { key1: 'onboarding.slide4.feature1', key2: 'onboarding.slide4.feature2' },
  },
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useAuth();
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      // Finish onboarding
      markOnboardingComplete();
      navigate('/login');
    }
  }, [currentSlide, markOnboardingComplete, navigate]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const skipOnboarding = useCallback(() => {
    markOnboardingComplete();
    navigate('/login');
  }, [markOnboardingComplete, navigate]);

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const SlideIcon = slide.icon;

  // ─── Swipe gesture support for onboarding ───
  const touchStartRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col overflow-hidden">
      {/* Top Section - Skip + Step indicator */}
      <div className="flex items-center justify-between p-4 pt-6">
        <span className="text-xs text-gray-400 font-medium">
          {currentSlide + 1} / {slides.length}
        </span>
        {!isLast && (
          <button
            onClick={skipOnboarding}
            className="text-gray-400 hover:text-gray-600 transition-colors px-3 py-1"
          >
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      {/* Main Content — swipeable */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="w-full flex flex-col items-center text-center"
          >
            {/* Image/Icon Area */}
            <div className={`w-full aspect-[4/3] rounded-3xl bg-gradient-to-br ${slide.gradient} mb-8 overflow-hidden relative flex items-center justify-center shadow-xl`}>
              {slide.image ? (
                <ImageWithFallback
                  src={slide.image}
                  alt={slide.titleKey}
                  className="w-full h-full object-cover mix-blend-overlay opacity-60"
                />
              ) : null}
              {/* Overlay content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                  <SlideIcon className="w-10 h-10 text-white" />
                </div>
                {isLast && slide.features && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      <span className="text-white text-sm">{t(slide.features.key1)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                      <Heart className="w-5 h-5 text-red-300" />
                      <span className="text-white text-sm">{t(slide.features.key2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Text Content */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${slide.iconBg} mb-3`}>
              <SlideIcon className={`w-4 h-4 ${slide.iconColor}`} />
              <span className={`text-xs ${slide.iconColor}`}>{t(slide.subtitleKey)}</span>
            </div>

            <h2 className="text-2xl text-gray-900 mb-3">{t(slide.titleKey)}</h2>
            <p className="text-gray-500 leading-relaxed max-w-sm">{t(slide.descKey)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="px-6 pb-10 pt-4 max-w-md mx-auto w-full">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentSlide ? 1 : -1);
                setCurrentSlide(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-8 bg-blue-500'
                  : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`${idx + 1}. ${t('onboarding.slide')}`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={goNext}
            className={`flex-1 h-14 rounded-2xl bg-gradient-to-r ${slide.gradient} text-white hover:opacity-90 transition-opacity border-0 shadow-lg gap-2`}
          >
            {isLast ? (
              <>
                {t('onboarding.start')}
                <Sparkles className="w-5 h-5" />
              </>
            ) : (
              <>
                {t('onboarding.next')}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}