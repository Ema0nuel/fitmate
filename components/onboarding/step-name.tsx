"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { NameIcon } from "./step-icons";

interface StepNameProps {
  name: string;
  onNext: (name: string) => void;
  onBack: () => void;
}

/**
 * Onboarding Step 1 — Name Input
 *
 * Collects the user's name for personalizing AI responses.
 * The name maps to POST /api/users { name } → user_id.
 *
 * Animation: slide-in from right (forward), content staggers up
 * with 40ms delays. The icon bounces in with a spring.
 *
 * Mobile: full-width input with large touch target (py-4).
 * Desktop: same layout, centered in phone frame.
 */
export function StepName({ name, onNext, onBack }: StepNameProps) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount with slight delay for animation
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter your name");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    onNext(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
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
      {/* Content area — takes remaining space, centers vertically */}
      <div className="flex flex-1 flex-col justify-center">
        {/* Icon — unique bounce-in */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 16,
            delay: 0.1,
          }}
          className="mb-6"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <NameIcon className="h-8 w-8" />
          </div>
        </motion.div>

        {/* Header text — staggered fade-up */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What should we call you?
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-8 text-sm text-muted-foreground"
        >
          We&apos;ll use your name to personalize your fitness guidance.
        </motion.p>

        {/* Input — slides up with delay */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <label
            htmlFor="onboarding-name"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Your name
          </label>
          <input
            ref={inputRef}
            id="onboarding-name"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Sarah"
            autoComplete="given-name"
            className="w-full rounded-xl border border-input bg-muted px-4 py-4 text-base text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Navigation buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex gap-3 pt-6"
      >
        <button
          onClick={onBack}
          className="flex-1 rounded-xl border border-input bg-background py-3.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted active:scale-[0.98]"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}
