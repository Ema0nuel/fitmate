"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding-store";
import { getUser, getProfile, updateProfile } from "@/lib/api";
import ChatHeader from "@/components/chat/chat-header";
import {
  Pencil,
  AlertCircle,
  Loader2,
  Check,
  X,
  Dumbbell,
  Target,
  Flame,
} from "lucide-react";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

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

type GenderOption = "male" | "female" | "other" | "prefer_not_to_say";
type FitnessLevel = "beginner" | "intermediate" | "advanced";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const GENDERS: { id: GenderOption; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
  { id: "prefer_not_to_say", label: "Prefer not to say" },
];

const LEVELS: {
  id: FitnessLevel;
  label: string;
  description: string;
  icon: typeof Dumbbell;
}[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to exercise or getting back into it",
    icon: Dumbbell,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Consistent routine for 6+ months",
    icon: Target,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Trained regularly for 2+ years",
    icon: Flame,
  },
];

const GOALS: { id: string; label: string }[] = [
  { id: "lose_weight", label: "Lose Weight" },
  { id: "build_muscle", label: "Build Muscle" },
  { id: "improve_endurance", label: "Improve Endurance" },
  { id: "general_health", label: "General Health" },
  { id: "learn_form", label: "Learn Proper Form" },
  { id: "increase_flexibility", label: "Increase Flexibility" },
];

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════

/**
 * /profile — User profile viewing and editing page.
 *
 * View mode: clean flat layout matching history page style.
 * Edit mode: form inputs with Save/Cancel.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { userId, _hasHydrated, profile: onboardingProfile } =
    useOnboardingStore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    gender: "" as GenderOption | "",
    weight_kg: "",
    height_cm: "",
    fitness_level: "" as FitnessLevel | "",
    medical_flags: "",
  });
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Route guard ──
  useEffect(() => {
    if (_hasHydrated && !userId) {
      router.replace("/onboarding");
    }
  }, [_hasHydrated, userId, router]);

  // ── Fetch profile ──
  useEffect(() => {
    if (!_hasHydrated || !userId) return;
    fetchProfile();
  }, [_hasHydrated, userId, onboardingProfile.goals]);

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

  // ── Enter edit mode ──
  function handleEdit() {
    if (!userProfile) return;
    setEditForm({
      name: userProfile.name,
      age: userProfile.age != null ? String(userProfile.age) : "",
      gender: (userProfile.gender as GenderOption) || "",
      weight_kg:
        userProfile.weight_kg != null ? String(userProfile.weight_kg) : "",
      height_cm:
        userProfile.height_cm != null ? String(userProfile.height_cm) : "",
      fitness_level: (userProfile.fitness_level as FitnessLevel) || "",
      medical_flags: userProfile.medical_flags || "",
    });
    setSelectedGoals([...userProfile.goals]);
    setSaveError(null);
    setIsEditing(true);
  }

  // ── Cancel edit ──
  function handleCancel() {
    setIsEditing(false);
    setSaveError(null);
  }

  // ── Save profile ──
  async function handleSave() {
    if (!userId) return;

    const age = editForm.age ? parseInt(editForm.age, 10) : null;
    const weight = editForm.weight_kg ? parseFloat(editForm.weight_kg) : null;
    const height = editForm.height_cm ? parseFloat(editForm.height_cm) : null;

    // Validate
    if (age !== null && (age < 1 || age > 120)) {
      setSaveError("Age must be between 1 and 120.");
      return;
    }
    if (weight !== null && (weight < 20 || weight > 300)) {
      setSaveError("Weight must be between 20 and 300 kg.");
      return;
    }
    if (height !== null && (height < 50 || height > 250)) {
      setSaveError("Height must be between 50 and 250 cm.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      await updateProfile(userId, {
        age,
        gender: editForm.gender || null,
        weight_kg: weight,
        height_cm: height,
        fitness_level: editForm.fitness_level || null,
        medical_flags: editForm.medical_flags || null,
      });

      // Re-fetch profile
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle goal selection in edit mode ──
  function toggleGoal(goalId: string) {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  }

  // ── Loading state ──
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

  // ── Error state ──
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

  // ════════ RENDER ════════

  return (
    <div className="flex h-dvh flex-col bg-background">
      <ChatHeader />

      <main className="flex-1 overflow-y-auto chat-scroll">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Page title */}
          <h1 className="text-lg font-semibold text-foreground mb-6">
            My Profile
          </h1>

          {isEditing ? (
            /* ══════ EDIT MODE ══════ */
            <EditForm
              form={editForm}
              setForm={setEditForm}
              selectedGoals={selectedGoals}
              toggleGoal={toggleGoal}
              saving={saving}
              saveError={saveError}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            /* ══════ VIEW MODE ══════ */
            <ViewMode
              profile={userProfile}
              onEdit={handleEdit}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// View Mode
// ═══════════════════════════════════════════════════

function ViewMode({
  profile,
  onEdit,
}: {
  profile: UserProfile;
  onEdit: () => void;
}) {
  return (
    <>
      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {profile.name}
          </h2>
          {profile.fitness_level && (
            <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {formatLevel(profile.fitness_level)}
            </span>
          )}
          {profile.weight_kg != null && profile.height_cm != null && (
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.weight_kg}kg · {profile.height_cm}cm
            </p>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <section className="mb-8">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Personal Info
        </h3>
        <div className="divide-y divide-border">
          <InfoRow
            label="Age"
            value={profile.age != null ? `${profile.age} years` : null}
          />
          <InfoRow label="Gender" value={formatGender(profile.gender)} />
          <InfoRow
            label="Weight"
            value={
              profile.weight_kg != null ? `${profile.weight_kg} kg` : null
            }
          />
          <InfoRow
            label="Height"
            value={
              profile.height_cm != null ? `${profile.height_cm} cm` : null
            }
          />
          <InfoRow
            label="Fitness Level"
            value={formatLevel(profile.fitness_level)}
          />
          <InfoRow
            label="Medical Conditions"
            value={profile.medical_flags || "None"}
          />
        </div>
      </section>

      {/* Goals */}
      {profile.goals.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Goals
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map((goal) => (
              <span
                key={goal}
                className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
              >
                {formatGoal(goal)}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Pencil className="h-4 w-4" />
        Edit Profile
      </button>
    </>
  );
}

// ═══════════════════════════════════════════════════
// Edit Mode
// ═══════════════════════════════════════════════════

function EditForm({
  form,
  setForm,
  selectedGoals,
  toggleGoal,
  saving,
  saveError,
  onSave,
  onCancel,
}: {
  form: {
    name: string;
    age: string;
    gender: GenderOption | "";
    weight_kg: string;
    height_cm: string;
    fitness_level: FitnessLevel | "";
    medical_flags: string;
  };
  setForm: React.Dispatch<React.SetStateAction<EditFormProps["form"]>>;
  selectedGoals: string[];
  toggleGoal: (id: string) => void;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Name */}
      <Field label="Name">
        <input
          type="text"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Your name"
        />
      </Field>

      {/* Age */}
      <Field label="Age">
        <input
          type="number"
          value={form.age}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, age: e.target.value }))
          }
          min={1}
          max={120}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="e.g. 25"
        />
      </Field>

      {/* Gender */}
      <Field label="Gender">
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  gender: prev.gender === g.id ? "" : g.id,
                }))
              }
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                form.gender === g.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Weight + Height */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Weight (kg)">
          <input
            type="number"
            value={form.weight_kg}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, weight_kg: e.target.value }))
            }
            min={20}
            max={300}
            step={0.1}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="kg"
          />
        </Field>
        <Field label="Height (cm)">
          <input
            type="number"
            value={form.height_cm}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, height_cm: e.target.value }))
            }
            min={50}
            max={250}
            step={0.1}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="cm"
          />
        </Field>
      </div>

      {/* Fitness Level */}
      <Field label="Fitness Level">
        <div className="space-y-2">
          {LEVELS.map((level) => {
            const Icon = level.icon;
            const isSelected = form.fitness_level === level.id;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    fitness_level: prev.fitness_level === level.id ? "" : level.id,
                  }))
                }
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {level.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {level.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Medical Conditions */}
      <Field label="Medical Conditions">
        <input
          type="text"
          value={form.medical_flags}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, medical_flags: e.target.value }))
          }
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="e.g. knee injury, allergies (optional)"
        />
      </Field>

      {/* Goals */}
      <Field label="Goals">
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="font-medium">{goal.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Save error */}
      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

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

// Type for EditForm props (used in setForm dispatch type)
type EditFormProps = {
  form: {
    name: string;
    age: string;
    gender: GenderOption | "";
    weight_kg: string;
    height_cm: string;
    fitness_level: FitnessLevel | "";
    medical_flags: string;
  };
};
