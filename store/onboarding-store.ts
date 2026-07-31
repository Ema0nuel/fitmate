/**
 * FitMate — Onboarding Store (Zustand)
 *
 * Manages the multi-step onboarding flow state.
 * Persisted to localStorage via Zustand's persist middleware,
 * so the user's progress survives page reloads and tab closures.
 *
 * Architecture:
 * - On first visit: isOnboardingComplete = false → redirects to /onboarding
 * - During onboarding: user fills steps, data accumulates in this store
 * - On completion: isOnboardingComplete = true, profile saved to SQLite via API
 * - On return visits: isOnboardingComplete = true → goes to /chat
 *
 * Backend flow (Chapter Three Section 3.5.4):
 *   1. POST /api/users        → creates user (name), returns user_id
 *   2. POST /api/profiles     → creates profile (body stats, fitness level, medical)
 *   3. POST /api/goals        → creates each fitness goal
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type GenderOption = "male" | "female" | "other" | "prefer_not_to_say";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export interface OnboardingProfile {
  name: string;
  age: number | null;
  gender: GenderOption | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: FitnessLevel | null;
  medical_flags: string;
  goals: string[];
}

interface OnboardingState {
  /** Current step index (0 = welcome, 1 = name, 2 = stats, 3 = level, 4 = goals) */
  currentStep: number;

  /** The user's profile data accumulated during onboarding */
  profile: OnboardingProfile;

  /** Whether onboarding has been completed and profile saved */
  isOnboardingComplete: boolean;

  /** The user ID returned from the backend after profile creation */
  userId: number | null;

  /** Whether the store has been hydrated from localStorage (prevents flash of wrong content) */
  _hasHydrated: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateProfile: (data: Partial<OnboardingProfile>) => void;
  completeOnboarding: (userId: number) => void;
  resetOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const TOTAL_STEPS = 5; // 0=welcome, 1=name, 2=stats, 3=level, 4=goals

const initialProfile: OnboardingProfile = {
  name: "",
  age: null,
  gender: null,
  weight_kg: null,
  height_cm: null,
  fitness_level: null,
  medical_flags: "",
  goals: [],
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 0,
      profile: { ...initialProfile },
      isOnboardingComplete: false,
      userId: null,
      _hasHydrated: false,

      setCurrentStep: (step: number) =>
        set({ currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)) }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 0),
        })),

      updateProfile: (data) =>
        set((state) => ({
          profile: { ...state.profile, ...data },
        })),

      completeOnboarding: (userId: number) =>
        set({
          isOnboardingComplete: true,
          userId,
        }),

      resetOnboarding: () =>
        set({
          currentStep: 0,
          profile: { ...initialProfile },
          isOnboardingComplete: false,
          userId: null,
        }),

      setHasHydrated: (value: boolean) => set({ _hasHydrated: value }),
    }),
    {
      name: "fitmate-onboarding",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        profile: state.profile,
        isOnboardingComplete: state.isOnboardingComplete,
        userId: state.userId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
