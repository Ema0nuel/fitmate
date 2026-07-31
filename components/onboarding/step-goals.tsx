"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GoalsIcon } from "./step-icons";

interface StepGoalsProps {
  goals: string[];
  onNext: (goals: string[]) => void;
  onBack: () => void;
}

type GoalOption = {
  id: string;
  label: string;
  description: string;
};

const GOALS: GoalOption[] = [
  {
    id: "lose_weight",
    label: "Lose weight",
    description: "Fat loss through sustainable caloric deficit and movement",
  },
  {
    id: "build_muscle",
    label: "Build muscle",
    description: "Hypertrophy-focused training with progressive overload",
  },
  {
    id: "improve_endurance",
    label: "Improve endurance",
    description: "Cardiovascular fitness, stamina, and recovery capacity",
  },
  {
    id: "general_health",
    label: "General health",
    description: "Balanced fitness for daily energy and longevity",
  },
  {
    id: "learn_form",
    label: "Learn proper form",
    description: "Master movement patterns to prevent injury and build confidence",
  },
  {
    id: "increase_flexibility",
    label: "Increase flexibility",
    description: "Mobility work, stretching, and range-of-motion improvement",
  },
];

// Custom SVG icons for each goal — small inline icons, no lucide dependency
const GoalIcons: Record<string, React.FC<{ className?: string }>> = {
  lose_weight: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 3v14M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  ),
  build_muscle: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="7" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="15" y="7" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  improve_endurance: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 10h2l2-4 3 8 2-4h2l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  general_health: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 4C7 1 2 3 2 7c0 5 8 9 8 9s8-4 8-9c0-4-5-6-8-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  learn_form: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 18l2-6 3 2 3-2 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 9v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  increase_flexibility: ({ className }) => (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 15c2-4 4-8 10-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 17l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 3l2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

/**
 * Onboarding Step 4 — Goals (Multi-Select)
 *
 * Chip-based multi-select for fitness goals. Users can pick multiple.
 * These map to POST /api/goals { user_id, goal_type } for each selected goal.
 *
 * Animation: slide-in from right. Chips stagger in from below in a grid.
 * Selected chips get a green fill with a spring animation on the checkmark.
 * Must select at least 1 goal to proceed.
 *
 * Mobile: 2-column grid for chips, large touch targets.
 */
export function StepGoals({ goals, onNext, onBack }: StepGoalsProps) {
  const [selected, setSelected] = useState<string[]>(goals);

  const toggleGoal = (goalId: string) => {
    setSelected((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = () => {
    if (selected.length > 0) {
      onNext(selected);
    }
  };

  return (
    <motion.div
      className="flex flex-1 flex-col px-6 py-8 sm:px-8"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="flex flex-1 flex-col justify-center">
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <GoalsIcon className="h-8 w-8" />
          </div>
        </motion.div>

        {/* Header */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          Your goals
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-6 text-sm text-muted-foreground"
        >
          Pick as many as apply — we&apos;ll focus your guidance accordingly.
        </motion.p>

        {/* Goals grid — 2 columns, staggered */}
        <div className="grid grid-cols-2 gap-2.5">
          {GOALS.map((goal, index) => {
            const isSelected = selected.includes(goal.id);
            const IconComponent = GoalIcons[goal.id];
            return (
              <motion.button
                key={goal.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.25 + index * 0.05,
                  duration: 0.35,
                  ease: [0.23, 1, 0.32, 1],
                }}
                onClick={() => toggleGoal(goal.id)}
                whileTap={{ scale: 0.96 }}
                className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-3.5 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-muted hover:border-border/80"
                }`}
              >
                {/* Icon + checkmark row */}
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-border/50 text-muted-foreground"
                    }`}
                  >
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                  </div>

                  {/* Checkmark indicator */}
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                      isSelected ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
                    {isSelected && (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        viewBox="0 0 12 12"
                        fill="none"
                        className="h-3 w-3"
                      >
                        <path
                          d="M2.5 6l2.5 2.5 4.5-5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    )}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {goal.label}
                  </div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {goal.description}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selection count */}
        {selected.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-center text-xs text-muted-foreground"
          >
            {selected.length} goal{selected.length !== 1 ? "s" : ""} selected
          </motion.p>
        )}
      </div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex gap-3 pt-6"
      >
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-input bg-background py-3.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted active:scale-[0.98]"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={selected.length === 0}
          className="flex-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary-light active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Finish
        </button>
      </motion.div>
    </motion.div>
  );
}
