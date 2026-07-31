"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useOnboardingStore, TOTAL_STEPS } from "@/store/onboarding-store";
import { completeOnboarding } from "@/lib/api";
import { WelcomeScreen } from "@/components/ui/onboarding-welcome-screen";
import { ProgressDots } from "./progress-dots";
import { StepName } from "./step-name";
import { StepStats } from "./step-stats";
import { StepLevel } from "./step-level";
import { StepGoals } from "./step-goals";

/**
 * Onboarding Flow — Multi-step orchestrator
 *
 * Manages the full onboarding sequence:
 *   Step 0: Welcome screen
 *   Step 1: Name input → POST /api/users
 *   Step 2: Body stats (age, gender, weight, height) → queued for profile
 *   Step 3: Fitness level (beginner/intermediate/advanced) → queued for profile
 *   Step 4: Goals (multi-select) → queued for goals
 *
 * On completion (step 4 → finish):
 *   1. Calls completeOnboarding() which runs the 3-phase backend flow:
 *      - POST /api/users (creates user, gets user_id)
 *      - POST /api/profiles (creates profile with all body stats)
 *      - POST /api/goals × N (creates each fitness goal)
 *   2. Saves profile to Zustand store → persisted to localStorage
 *   3. Navigates to /chat
 *
 * If the backend is unreachable, the profile is still saved locally
 * (Zustand persist) and onboarding is marked complete — offline-first.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const {
    currentStep,
    profile,
    nextStep,
    prevStep,
    updateProfile,
    completeOnboarding: markComplete,
  } = useOnboardingStore();

  const [isCompleting, setIsCompleting] = useState(false);

  // Step 0 → 1: Welcome → Name
  const handleWelcomeNext = useCallback(() => {
    nextStep();
  }, [nextStep]);

  // Step 1 → 2: Name → Stats
  const handleNameNext = useCallback(
    (name: string) => {
      updateProfile({ name });
      nextStep();
    },
    [updateProfile, nextStep]
  );

  // Step 2 → 3: Stats → Level
  const handleStatsNext = useCallback(
    (stats: {
      age: number;
      gender: "male" | "female" | "other" | "prefer_not_to_say";
      weight_kg: number;
      height_cm: number;
    }) => {
      updateProfile(stats);
      nextStep();
    },
    [updateProfile, nextStep]
  );

  // Step 3 → 4: Level → Goals
  const handleLevelNext = useCallback(
    (fitness_level: "beginner" | "intermediate" | "advanced") => {
      updateProfile({ fitness_level });
      nextStep();
    },
    [updateProfile, nextStep]
  );

  // Step 4 → Complete: Goals → Save & redirect to /chat
  const handleGoalsNext = useCallback(
    async (goals: string[]) => {
      updateProfile({ goals });
      setIsCompleting(true);

      // Grab the full final profile from the store (includes all prior steps)
      const finalProfile = {
        ...useOnboardingStore.getState().profile,
        goals,
      };

      try {
        // 3-phase backend flow: user → profile → goals
        const result = await completeOnboarding({
          name: finalProfile.name,
          age: finalProfile.age,
          gender: finalProfile.gender,
          weight_kg: finalProfile.weight_kg,
          height_cm: finalProfile.height_cm,
          fitness_level: finalProfile.fitness_level,
          medical_flags: finalProfile.medical_flags,
          goals: finalProfile.goals,
        });

        // Mark complete with the backend-assigned user ID
        markComplete(result.user.id);
      } catch (err) {
        console.warn("Backend unreachable — saving profile locally only:", err);
        // Offline-first: mark complete even if backend is down.
        // Profile is already in localStorage via Zustand persist.
        markComplete(0);
      }

      // Navigate to chat
      router.push("/chat");
    },
    [updateProfile, markComplete, router]
  );

  // Back navigation for all steps
  const handleBack = useCallback(() => {
    prevStep();
  }, [prevStep]);

  // Step content based on current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeScreen onButtonClick={handleWelcomeNext} />;
      case 1:
        return (
          <StepName
            name={profile.name}
            onNext={handleNameNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <StepStats
            age={profile.age}
            gender={profile.gender}
            weight_kg={profile.weight_kg}
            height_cm={profile.height_cm}
            onNext={handleStatsNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <StepLevel
            fitnessLevel={profile.fitness_level}
            onNext={handleLevelNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <StepGoals
            goals={profile.goals}
            onNext={handleGoalsNext}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Progress indicator — visible after welcome screen */}
      {currentStep > 0 && (
        <ProgressDots
          currentStep={currentStep - 1}
          totalSteps={TOTAL_STEPS - 1}
        />
      )}

      {/* Step content with animated transitions */}
      <AnimatePresence mode="wait">
        <div key={currentStep} className="onboarding-scroll flex flex-1 flex-col overflow-y-auto">
          {renderStep()}
        </div>
      </AnimatePresence>

      {/* Loading overlay during profile save */}
      {isCompleting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Setting up your profile...
            </p>
            <p className="font-mono text-xs text-muted-foreground/60">
              Creating your fitness companion
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
