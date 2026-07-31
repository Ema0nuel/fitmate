"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { BodyStatsIcon } from "./step-icons";
import type { GenderOption } from "@/store/onboarding-store";

interface StepStatsProps {
  age: number | null;
  gender: GenderOption | null;
  weight_kg: number | null;
  height_cm: number | null;
  onNext: (stats: {
    age: number;
    gender: GenderOption;
    weight_kg: number;
    height_cm: number;
  }) => void;
  onBack: () => void;
}

type GenderChoice = {
  id: GenderOption;
  label: string;
  shortLabel: string;
};

const GENDERS: GenderChoice[] = [
  { id: "male", label: "Male", shortLabel: "M" },
  { id: "female", label: "Female", shortLabel: "F" },
  { id: "other", label: "Other", shortLabel: "O" },
  { id: "prefer_not_to_say", label: "Prefer not to say", shortLabel: "-" },
];

/**
 * Onboarding Step 2 — Body Stats
 *
 * Collects age, gender, weight (kg), and height (cm).
 * These map to POST /api/profiles { user_id, age, gender, weight_kg, height_cm }.
 *
 * Animation: each card staggers in from below with 60ms delays.
 * The icon bounces in first, then the header, then each stat card.
 *
 * Mobile: full-width stepper cards with large +/- touch targets (48px).
 * Gender is a horizontal chip row above the steppers.
 */
export function StepStats({ age, gender, weight_kg, height_cm, onNext, onBack }: StepStatsProps) {
  const [ageVal, setAgeVal] = useState(age ?? 25);
  const [genderVal, setGenderVal] = useState<GenderOption>(gender ?? "prefer_not_to_say");
  const [weightVal, setWeightVal] = useState(weight_kg ?? 70);
  const [heightVal, setHeightVal] = useState(height_cm ?? 170);

  const handleSubmit = () => {
    onNext({
      age: ageVal,
      gender: genderVal,
      weight_kg: weightVal,
      height_cm: heightVal,
    });
  };

  // Stagger delay calculator — each card appears 60ms after the previous
  const stagger = (index: number) => 0.2 + index * 0.06;

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
            <BodyStatsIcon className="h-8 w-8" />
          </div>
        </motion.div>

        {/* Header */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          Body stats
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="mb-6 text-sm text-muted-foreground"
        >
          These help us tailor exercises and nutrition to your body.
        </motion.p>

        {/* Gender selection — chips row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stagger(0), duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="mb-4"
        >
          <label className="mb-2 block text-sm font-medium text-foreground">
            Gender
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GENDERS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGenderVal(g.id)}
                className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                  genderVal === g.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="sm:hidden">{g.shortLabel}</span>
                <span className="hidden sm:inline">{g.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stepper cards — staggered from below */}
        <div className="flex flex-col gap-3">
          <StepperCard
            label="Age"
            value={ageVal}
            onChange={setAgeVal}
            min={10}
            max={120}
            step={1}
            unit="yrs"
            delay={stagger(1)}
          />
          <StepperCard
            label="Weight"
            value={weightVal}
            onChange={setWeightVal}
            min={30}
            max={300}
            step={1}
            unit="kg"
            delay={stagger(2)}
          />
          <StepperCard
            label="Height"
            value={heightVal}
            onChange={setHeightVal}
            min={100}
            max={250}
            step={1}
            unit="cm"
            delay={stagger(3)}
          />
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
          onClick={handleSubmit}
          className="flex-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Stepper Card — editable numeric input with +/- buttons
// ═══════════════════════════════════════════════════
//
// Uses a LOCAL string state for the input field so the user can type
// freely without React fighting the keystroke on every render.
// The parent number state only updates on blur or Enter — this is
// the standard pattern for "numeric input that lets you type".
//
function StepperCard({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  delay,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  delay: number;
}) {
  // Local string state — only synced to parent on commit (blur/Enter)
  const [inputStr, setInputStr] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // When +/- buttons change the parent value, update the local string
  const handleButton = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    onChange(next);
    setInputStr(String(next));
  };

  // Commit: validate, clamp, sync back to parent
  const commitValue = () => {
    const parsed = parseInt(inputStr, 10);
    if (isNaN(parsed) || parsed < min || parsed > max) {
      // Invalid — snap back to current parent value
      setInputStr(String(value));
    } else if (parsed !== value) {
      onChange(parsed);
      setInputStr(String(parsed));
    }
  };

  // Free-form typing — only update the local string, no parent sync
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits only (no negatives, no decimals for age/height)
    const cleaned = raw.replace(/[^0-9]/g, "");
    setInputStr(cleaned);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitValue();
      inputRef.current?.blur();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3.5"
    >
      <span className="min-w-[4.5rem] text-sm font-medium text-foreground">
        {label}
      </span>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            handleButton(-step);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors duration-150 hover:bg-border active:scale-95"
          aria-label={`Decrease ${label}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Editable numeric input */}
        <div className="flex items-baseline justify-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={inputStr}
            onChange={handleChange}
            onBlur={commitValue}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className="w-16 bg-transparent text-center text-xl font-bold tabular-nums text-foreground outline-none focus:ring-1 focus:ring-primary/30 rounded-md"
            aria-label={`${label} value`}
          />
          <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
        </div>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            handleButton(step);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors duration-150 hover:bg-border active:scale-95"
          aria-label={`Increase ${label}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
