"use client";

import { motion } from "framer-motion";

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Onboarding Progress Indicator
 *
 * Animated bar-based progress indicator at the top of the onboarding flow.
 * Each step is a thin bar that expands into a pill when active and fills
 * with green when completed.
 *
 * Design: minimal and non-distracting. Uses spring animation for the
 * width transition — the active bar "grows" smoothly. Completed bars
 * stay filled. Upcoming bars are thin and muted.
 *
 * Accessibility: uses aria-valuenow/aria-valuemin/aria-valuemax for
 * screen readers.
 */
export function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  // Skip the welcome screen in progress (step 0 = welcome, steps 1-4 = actual)
  const progressStep = Math.max(0, currentStep);
  const progress = totalSteps > 0 ? (progressStep / totalSteps) * 100 : 0;

  return (
    <div className="w-full px-6 pt-4 pb-2 sm:px-8">
      {/* Overall progress bar */}
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-border/50">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 20,
          }}
        />
      </div>

      {/* Step indicators — small pills */}
      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={progressStep}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-label={`Step ${progressStep} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              animate={{
                width: isActive ? 20 : 6,
                backgroundColor: isActive
                  ? "var(--primary)"
                  : isCompleted
                    ? "var(--primary-light)"
                    : "var(--border)",
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
