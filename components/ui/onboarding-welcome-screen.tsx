"use client";

/**
 * FitMate — Welcome Screen
 *
 * First thing users see during onboarding. Hero image with
 * brand name, product summary, and single CTA.
 *
 * Design: full-viewport, centered layout, generous breathing room.
 * Responsive: fills viewport on mobile (dvh), centered card on desktop.
 */

import { motion } from "framer-motion";

interface WelcomeScreenProps {
  onButtonClick: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 18,
    },
  },
} as const;

const imageVariants = {
  hidden: { opacity: 0, scale: 1.02 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  },
} as const;

export function WelcomeScreen({ onButtonClick }: WelcomeScreenProps) {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-between bg-background"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero image — capped at 40dvh on mobile so text has room */}
      <motion.div className="w-full" variants={imageVariants}>
        <img
          src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=80"
          alt="Fitness training"
          className="max-h-[38dvh] w-full object-cover sm:max-h-none"
          style={{ clipPath: "ellipse(100% 60% at 50% 40%)" }}
        />
      </motion.div>

      {/* Content — generous top gap so it breathes away from the image */}
      <motion.div className="flex flex-1 flex-col items-center justify-center px-6 pt-6 sm:pt-8 text-center">
        <motion.h1
          variants={fadeUp}
          className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Welcome to{" "}
          <span className="text-primary">FitMate</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="max-w-xs text-sm leading-relaxed text-muted-foreground"
        >
          Your personal AI fitness coach. Evidence-based exercise, nutrition,
          and health guidance — tailored to you.
        </motion.p>
      </motion.div>

      {/* CTA */}
      <motion.div variants={fadeUp} className="w-full px-6 pb-8 pt-2">
        <button
          onClick={onButtonClick}
          className="w-full rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
          style={{ cursor: "pointer" }}
        >
          Let&apos;s get started
        </button>
      </motion.div>
    </motion.div>
  );
}
