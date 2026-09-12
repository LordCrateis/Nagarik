import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  UserRoundPlus,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CitizenProfile } from "@workspace/api-client-react";
import { AuthField, AuthShell, authInputClass } from "@/components/AuthShell";
import { VibeSelect } from "@/components/VibeSelect";
import { createAccount, emptyProfile } from "@/lib/auth";
import { districtsForState, states } from "@/lib/location-options";

export default function CreateAccountPage() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<CitizenProfile>({ ...emptyProfile });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const update = (key: keyof CitizenProfile, value: string | number) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (
      !profile.name.trim() ||
      !profile.state.trim() ||
      !profile.district.trim() ||
      !email.trim()
    ) {
      setError("Add your name, location, and email to continue.");
      return;
    }
    if (profile.age < 0 || profile.age > 120) {
      setError("Enter an age between 0 and 120.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const result = await createAccount(email, password, profile);
      if (result.requiresEmailConfirmation) {
        setNotice(
          "Check your inbox and confirm your email address, then log in to continue.",
        );
      } else {
        setLocation("/app");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not create your account.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Your starting point"
      title={
        <>
          Tell us once.
          <br />
          <span className="text-[hsl(var(--accent))]">Use it when needed.</span>
        </>
      }
      description="Your basic profile helps Nagarik locate the right state, age, and social-category rules before you begin a benefit check."
      points={[
        "Location narrows schemes to the right government",
        "Age and category identify relevant eligibility rules",
        "You can complete income and document details next",
      ]}
    >
      <div className="flex min-h-full items-center p-5 sm:p-8 lg:p-10">
        <div className="mx-auto w-full max-w-2xl animate-rise-in">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <UserRoundPlus size={20} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
                Create account
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-[-.04em] sm:text-4xl">
                Build your basic profile.
              </h2>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                These details become the starting point for every check.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AuthField label="Full name">
                <input
                  value={profile.name}
                  onChange={(event) => update("name", event.target.value)}
                  className={authInputClass}
                  placeholder="Meena Kumari"
                  data-testid="input-create-name"
                />
              </AuthField>
              <AuthField label="Age">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={profile.age}
                  onChange={(event) =>
                    update("age", Number(event.target.value))
                  }
                  className={authInputClass}
                  data-testid="input-create-age"
                />
              </AuthField>
              <AuthField label="Gender">
                <VibeSelect
                  value={profile.gender}
                  onChange={(value) => update("gender", value)}
                  options={["Prefer not to say", "Woman", "Man", "Non-binary"]}
                  placeholder="Choose gender"
                  testId="select-create-gender"
                />
              </AuthField>
              <AuthField label="State">
                <VibeSelect
                  value={profile.state}
                  onChange={(value) => {
                    update("state", value);
                    if (!districtsForState(value).includes(profile.district))
                      update("district", "");
                  }}
                  options={states}
                  placeholder="Choose state"
                  testId="select-create-state"
                />
              </AuthField>
              <AuthField label="District">
                <VibeSelect
                  value={profile.district}
                  onChange={(value) => update("district", value)}
                  options={districtsForState(profile.state)}
                  placeholder={
                    profile.state ? "Choose district" : "Choose state first"
                  }
                  testId="select-create-district"
                  disabled={!profile.state}
                />
              </AuthField>
              <AuthField label="Social category">
                <VibeSelect
                  value={profile.category}
                  onChange={(value) => update("category", value)}
                  options={["General", "SC", "ST", "OBC", "EWS"]}
                  placeholder="Choose category"
                  testId="select-create-category"
                />
              </AuthField>
            </div>
            <div className="border-t border-[hsl(var(--border))] pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <AuthField label="Email">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={authInputClass}
                    placeholder="you@example.com"
                    data-testid="input-create-email"
                  />
                </AuthField>
                <AuthField label="Password">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`${authInputClass} pr-11`}
                      placeholder="8+ characters"
                      data-testid="input-create-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[hsl(var(--muted-foreground))]"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </AuthField>
                <AuthField label="Confirm password">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={authInputClass}
                    placeholder="Repeat password"
                    data-testid="input-create-confirm-password"
                  />
                </AuthField>
              </div>
            </div>
            {error && (
              <p
                className="rounded-xl bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"
                role="alert"
                data-testid="text-create-error"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                className="rounded-xl bg-[hsl(var(--secondary))] px-4 py-3 text-sm text-[hsl(var(--primary))]"
                role="status"
                data-testid="text-create-notice"
              >
                {notice}
              </p>
            )}
            <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Already registered?{" "}
                <Link
                  href="/login"
                  className="font-bold text-[hsl(var(--primary))] hover:underline"
                >
                  Log in
                </Link>
              </p>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
                data-testid="button-create-submit"
              >
                {pending ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" /> Creating
                    profile
                  </>
                ) : (
                  <>
                    Continue to my situation <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
