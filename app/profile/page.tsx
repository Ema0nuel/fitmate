"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { getUser, getProfile } from "@/lib/api";
import ChatHeader from "@/components/chat/chat-header";
import { ArrowLeft, Pencil, AlertCircle } from "lucide-react";
import type { FitnessLevel } from "@/store/onboarding-store";

interface UserProfile {
  name: string;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: string | null;
  medical_flags: string | null;
  goals: string[];
}

/**
 * /profile — User profile viewing and editing page.
 *
 * View mode: read-only display of profile data in card layout.
 * Edit mode: form inputs for all profile fields with Save/Cancel.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { userId, _hasHydrated, profile: onboardingProfile } = useOnboardingStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Redirect to onboarding if user never completed it
  useEffect(() => {
    if (_hasHydrated && !userId) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, userId, router]);

  // Fetch profile data on mount
  useEffect(() => {
    if (!_hasHydrated || !userId) return;

    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);

        const [user, profile] = await Promise.all([
          getUser(userId!),
          getProfile(userId!),
        ]);

        if (!user || !profile) {
          setError("Profile not found. Please complete onboarding first.");
          return;
        }

        // Fetch goals from onboarding store (goals aren't in the profiles API)
        setUserProfile({
          name: user.name,
          age: profile.age,
          gender: profile.gender,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          fitness_level: profile.fitness_level,
          medical_flags: profile.medical_flags,
          goals: onboardingProfile.goals,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [_hasHydrated, userId, onboardingProfile.goals]);

  // Back button handler — defaults to /chat if no history
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/chat");
    }
  };

  // Loading state
  if (!_hasHydrated || loading) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <ChatHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </main>
      </div>
    );
  }

  // Error state
  if (error || !userProfile) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <ChatHeader />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {error || "Profile not found"}
          </p>
          <button
            onClick={() => router.push("/onboarding")}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-light"
          >
            Complete Onboarding
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <ChatHeader />

      <main className="flex flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {/* Page header with back button */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">My Profile</h1>
          </div>

          {/* ══════ VIEW MODE ══════ */}

          {/* Profile Hero Card */}
          <div className="mb-4 rounded-xl border border-border bg-white p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {userProfile.name}
                </h2>
                {userProfile.fitness_level && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {formatLevel(userProfile.fitness_level)}
                  </span>
                )}
                {userProfile.weight_kg != null && userProfile.height_cm != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {userProfile.weight_kg}kg · {userProfile.height_cm}cm
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Info Card */}
          <div className="mb-4 rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
              Personal Info
            </h3>
            <div className="divide-y divide-border">
              <InfoRow label="Age" value={userProfile.age != null ? `${userProfile.age} years` : null} />
              <InfoRow label="Gender" value={formatGender(userProfile.gender)} />
              <InfoRow label="Weight" value={userProfile.weight_kg != null ? `${userProfile.weight_kg} kg` : null} />
              <InfoRow label="Height" value={userProfile.height_cm != null ? `${userProfile.height_cm} cm` : null} />
              <InfoRow label="Fitness Level" value={formatLevel(userProfile.fitness_level)} />
              <InfoRow label="Medical Conditions" value={userProfile.medical_flags || "None"} />
            </div>
          </div>

          {/* Goals Card */}
          {userProfile.goals.length > 0 && (
            <div className="mb-6 rounded-xl border border-border bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
                Goals
              </h3>
              <div className="flex flex-wrap gap-2">
                {userProfile.goals.map((goal) => (
                  <span
                    key={goal}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    {formatGoal(goal)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Edit Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 rounded-xl border border-primary px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Helper components
// ═══════════════════════════════════════════════════

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Formatters
// ═══════════════════════════════════════════════════

function formatLevel(level: string | null): string | null {
  if (!level) return null;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function formatGender(gender: string | null): string | null {
  if (!gender) return null;
  const map: Record<string, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
  };
  return map[gender] || gender;
}

function formatGoal(goal: string): string {
  return goal
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}