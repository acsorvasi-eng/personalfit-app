/**
 * ====================================================================
 * DSMWorkoutDayBanner - Shows today's planned workout type
 * ====================================================================
 * Connects the meal plan's exercise schedule to the Workout tab:
 *   Mon / Wed / Thu → Edzésnap (training)
 *   Fri → Pihenőnap / Úszás (swim)
 *   Other → Pihenőnap (rest)
 *
 * Friction reducer: users don't have to remember which day is what.
 * ====================================================================
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Waves, Moon, Sparkles } from "lucide-react";

interface WorkoutDayBannerProps {
  className?: string;
}

function getTodayWorkoutType(): { type: "training" | "swim" | "rest"; label: string; description: string } {
  const jsDay = new Date().getDay(); // 0=Sun
  const planDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon

  if (planDay === 0 || planDay === 2 || planDay === 3) {
    return {
      type: "training",
      label: "Edzesnap",
      description: "Ma edzes van a tervben. Rogzitsd az aktivitasod!",
    };
  }
  if (planDay === 4) {
    return {
      type: "swim",
      label: "Pihenonap / Uszas",
      description: "Ma opcionalis uszas vagy konnyuaktivitas van a tervben.",
    };
  }
  return {
    type: "rest",
    label: "Pihenonap",
    description: "Ma pihenonap van. Regeneralodj, igyel vizet!",
  };
}

const DAY_CONFIG = {
  training: {
    gradient: "from-orange-500 to-rose-500",
    icon: Dumbbell,
    iconBg: "bg-orange-400/20",
    emoji: "💪",
  },
  swim: {
    gradient: "from-cyan-500 to-blue-500",
    icon: Waves,
    iconBg: "bg-cyan-400/20",
    emoji: "🏊",
  },
  rest: {
    gradient: "from-indigo-500 to-purple-500",
    icon: Moon,
    iconBg: "bg-indigo-400/20",
    emoji: "😴",
  },
};

export function DSMWorkoutDayBanner({ className = "" }: WorkoutDayBannerProps) {
  const info = useMemo(getTodayWorkoutType, []);
  const config = DAY_CONFIG[info.type];
  const Icon = config.icon;

  const dayNames = ["Vasarnap", "Hetfo", "Kedd", "Szerda", "Csutortok", "Pentek", "Szombat"];
  const today = dayNames[new Date().getDay()];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-4 relative overflow-hidden ${className}`}
    >
      {/* Decorative circles */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
      <div className="absolute -bottom-3 -left-3 w-14 h-14 bg-white/10 rounded-full" />

      <div className="relative flex items-center gap-3">
        <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center backdrop-blur-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-[11px] font-medium">{today}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/70 text-[11px]">{config.emoji}</span>
          </div>
          <div className="text-white text-sm mt-0.5" style={{ fontWeight: 700 }}>
            {info.label}
          </div>
          <div className="text-white/70 text-[11px] mt-0.5">
            {info.description}
          </div>
        </div>

        {info.type === "training" && (
          <div className="flex-shrink-0">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
        )}
      </div>
    </motion.div>
  );
}