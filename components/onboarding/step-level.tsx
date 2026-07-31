"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FitnessLevelIcon } from "./step-icons";
import type { FitnessLevel } from "@/store/onboarding-store";

interface StepLevelProps {
  fitnessLevel: FitnessLevel | null;
  onNext: (level: FitnessLevel) => void;
  onBack: () => void;
}

type LevelOption = {
  id: FitnessLevel;
  label: string;
  description: string;
  detail: string;
};

const LEVELS: LevelOption[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to exercise or getting back into it",
    detail: "We'll start with foundational movements and build from there.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Consistent routine for 6+ months",
    detail: "You know the basics — we'll push intensity and variety.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Trained regularly for 2+ years",
    detail: "Expect complex programming and progressive overload.",
  },
];

/**
 * Onboarding Step 3 — Fitness Level
 *
 * Single-select from beginner/intermediate/advanced.
 * Maps to POST /api/profiles { fitness_level }.
 *
 * Animation: slide-in from right. Each card appears with 60ms stagger.
 * Selection uses a layout animation — the selected card subtly highlights
 * with a green tint and the description expands below it (AnimatePresence).
 *
 * Mobile: full-width stacked cards, large touch targets.
 */
export function StepLevel({ fitnessLevel, onNext, onBack }: StepLevelProps) {
  const [selected, setSelected] = useState<FitnessLevel | null>(fitnessLevel);

  const handleContinue = () => {
    if (selected) {
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
            <FitnessLevelIcon className="h-8 w-8" />
          </div>
        </motion.div>

        {/* Header */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          Fitness level
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-6 text-sm text-muted-foreground"
        >
          This helps us match exercises to your experience.
        </motion.p>

        {/* Level cards — stacked with stagger */}
        <div className="flex flex-col gap-3">
          {LEVELS.map((level, index) => {
            const isSelected = selected === level.id;
            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.25 + index * 0.06,
                  duration: 0.4,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(level.id)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-muted hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Radio indicator */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                        isSelected ? "border-primary" : "border-border"
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="h-2.5 w-2.5 rounded-full bg-primary"
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {level.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {level.description}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail — only when selected */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3 ml-8 text-xs leading-relaxed text-muted-foreground">
                          {level.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
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
          disabled={!selected}
          className="flex-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary-light active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}
