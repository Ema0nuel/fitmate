"use client";

/**
 * FitMate — Onboarding Step Icons
 *
 * Custom SVG icons for each onboarding step. Each icon has a unique
 * design that communicates its step's purpose at a glance.
 *
 * All icons use the FitMate green palette (#16a34a / #22c55e / #15803d)
 * with rounded strokes for warmth. No sharp geometry.
 *
 * Designed for 48x48 container (w-12 h-12) with 2px strokes.
 */

// ═══════════════════════════════════════════════════
// Step 1 — Name: Person with identity spark
// ═══════════════════════════════════════════════════

export function NameIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Person silhouette */}
      <circle cx="24" cy="16" r="8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16"
        stroke="#16a34a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Identity spark — small diamond star */}
      <path
        d="M37 10l1.5 3 3 1.5-3 1.5L37 19l-1.5-3-3-1.5 3-1.5z"
        fill="#22c55e"
        opacity="0.8"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════
// Step 2 — Body Stats: Body outline with measurement lines
// ═══════════════════════════════════════════════════

export function BodyStatsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="24" cy="10" r="5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Body line */}
      <line x1="24" y1="15" x2="24" y2="35" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms spread */}
      <path d="M12 26 L24 20 L36 26" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Legs */}
      <path d="M18 42 L24 35 L30 42" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Height measurement — left */}
      <line x1="6" y1="8" x2="6" y2="42" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      <line x1="4" y1="8" x2="8" y2="8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="42" x2="8" y2="42" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════
// Step 3 — Fitness Level: Mountain summit with flags
// ═══════════════════════════════════════════════════

export function FitnessLevelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Mountain base */}
      <path
        d="M4 40 L18 14 L24 22 L32 10 L44 40Z"
        stroke="#16a34a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Summit flag */}
      <line x1="32" y1="10" x2="32" y2="4" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 4 L40 7 L32 10" fill="#22c55e" opacity="0.6" />
      {/* Trail dots — progress markers */}
      <circle cx="18" cy="28" r="1.5" fill="#22c55e" opacity="0.5" />
      <circle cx="24" cy="22" r="1.5" fill="#22c55e" opacity="0.7" />
      <circle cx="30" cy="14" r="2" fill="#16a34a" opacity="0.9" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════
// Step 4 — Goals: Target with arrow hitting bullseye
// ═══════════════════════════════════════════════════

export function GoalsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="24" cy="24" r="18" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Middle ring */}
      <circle cx="24" cy="24" r="11" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      {/* Bullseye */}
      <circle cx="24" cy="24" r="4" fill="#16a34a" />
      {/* Arrow shaft */}
      <line x1="8" y1="40" x2="20" y2="28" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
      {/* Arrow head */}
      <path d="M16 32 L20 28 L16 26" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow fletching */}
      <path d="M10 40 L6 38" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 40 L8 44" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════
// Welcome — FitMate Logo: Dumbbell with energy waves
// ═══════════════════════════════════════════════════

export function FitMateLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-label="FitMate logo"
    >
      {/* Dumbbell left weight */}
      <rect x="14" y="40" width="14" height="40" rx="5" stroke="#15803d" strokeWidth="3" />
      {/* Dumbbell right weight */}
      <rect x="92" y="40" width="14" height="40" rx="5" stroke="#15803d" strokeWidth="3" />
      {/* Dumbbell bar */}
      <line x1="28" y1="60" x2="92" y2="60" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
      {/* Inner weight highlights */}
      <rect x="18" y="46" width="6" height="28" rx="2" fill="#22c55e" opacity="0.3" />
      <rect x="96" y="46" width="6" height="28" rx="2" fill="#22c55e" opacity="0.3" />
      {/* Energy wave left */}
      <path d="M8 60 Q4 50 8 40" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M4 60 Q-2 48 4 36" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.25" />
      {/* Energy wave right */}
      <path d="M112 60 Q116 50 112 40" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M116 60 Q122 48 116 36" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.25" />
    </svg>
  );
}
