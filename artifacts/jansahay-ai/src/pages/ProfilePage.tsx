import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  LoaderCircle,
  LogOut,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CitizenProfile } from "@workspace/api-client-react";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VibeSelect } from "@/components/VibeSelect";
import { SectionKicker } from "@/components/Primitives";
import { districtsForState, states } from "@/lib/location-options";
import {
  deleteAccount,
  emptyProfile,
  logOut,
  updateStoredProfile,
  updateEmail,
  updatePassword,
  uploadProfilePhoto,
  useAuthSession,
} from "@/lib/auth";

const documents = [
  "Aadhaar / identity proof",
  "Income certificate",
  "Residence proof",
  "Bank account details",
  "Caste certificate",
  "Disability certificate",
  "Land ownership record",
];

const inputClass =
  "w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { session, loading } = useAuthSession();
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CitizenProfile>({ ...emptyProfile });
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) setLocation("/login");
    if (session) {
      setProfile(session.profile);
      setAvatarUrl(session.avatarUrl);
      setEmail(session.email);
    }
  }, [loading, session, setLocation]);

  const update = (
    key: keyof CitizenProfile,
    value: string | number | boolean | null,
  ) => setProfile((current) => ({ ...current, [key]: value }));

  const toggleDocument = (document: string) => {
    setProfile((current) => ({
      ...current,
      availableDocuments: current.availableDocuments.includes(document)
        ? current.availableDocuments.filter((item) => item !== document)
        : [...current.availableDocuments, document],
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    setError("");
    if (
      !profile.name.trim() ||
      !profile.state.trim() ||
      !profile.district.trim()
    ) {
      setError("Add your name, state, and district before saving.");
      return;
    }
    setSaving(true);
    try {
      await updateStoredProfile(profile);
      setNotice("Your profile is up to date.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setNotice("");
    setUploading(true);
    try {
      setAvatarUrl(await uploadProfilePhoto(file));
      setNotice("Profile photo updated.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not upload that photo.",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAccount = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      setLocation("/");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not delete your account.",
      );
      setDeleting(false);
    }
  };

  const saveSecurity = async (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!email.trim()) {
      setError("Add an email address before saving.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("A new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setSecuritySaving(true);
    try {
      if (email.trim() !== (session?.email ?? "")) await updateEmail(email);
      if (newPassword) await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Account security details updated.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not update your security details.",
      );
    } finally {
      setSecuritySaving(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))]">
        <LoaderCircle className="animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" data-testid="link-profile-home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3"><LanguageSwitcher /><Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
            data-testid="link-profile-workspace"
          >
            <ArrowLeft size={16} /> Back to workspace
          </Link></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-9 lg:px-10 lg:py-14">
        <div className="mb-10 max-w-2xl">
          <SectionKicker>Account settings</SectionKicker>
          <h1 className="font-display text-4xl font-bold tracking-[-.05em] sm:text-6xl">
            Your profile,
            <br />
            <span className="text-[hsl(var(--primary))]">kept ready.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            Keep your details current so every “Myself” check starts from the
            right place. You can still enter a separate person’s details from
            the workspace.
          </p>
        </div>

        <form onSubmit={save} className="space-y-6">
          <section
            className="grid gap-6 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_18px_60px_hsl(var(--primary)/.05)] sm:p-8 lg:grid-cols-[240px_1fr]"
            data-testid="section-profile-identity"
          >
            <div className="flex flex-col items-center justify-center border-b border-[hsl(var(--border))] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
              <div className="relative">
                <div className="grid size-32 place-items-center overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] font-display text-5xl font-bold text-[hsl(var(--primary-foreground))] shadow-[0_16px_35px_hsl(var(--primary)/.2)]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    profile.name.slice(0, 1).toUpperCase() || (
                      <UserRound size={44} />
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 grid size-10 place-items-center rounded-full border-4 border-[hsl(var(--card))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] transition-transform hover:scale-105 disabled:opacity-60"
                  aria-label="Change profile photo"
                  data-testid="button-upload-photo"
                >
                  {uploading ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Camera size={17} />
                  )}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    void choosePhoto(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                  data-testid="input-profile-photo"
                />
              </div>
              <p className="mt-5 text-center text-sm font-bold">
                {profile.name || "Your name"}
              </p>
              <p className="mt-1 text-center text-xs text-[hsl(var(--muted-foreground))]">
                {session.email}
              </p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))] hover:underline"
              >
                <Upload size={13} /> Change photo
              </button>
            </div>
            <div>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <SectionKicker>Identity</SectionKicker>
                  <h2 className="font-display text-2xl font-bold">
                    The details we remember
                  </h2>
                </div>
                <ShieldCheck
                  className="shrink-0 text-[hsl(var(--primary))]"
                  size={22}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Full name">
                  <input
                    className={inputClass}
                    value={profile.name}
                    onChange={(event) => update("name", event.target.value)}
                    data-testid="input-profile-name"
                  />
                </Field>
                <Field label="Age">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    max={120}
                    value={profile.age}
                    onChange={(event) =>
                      update("age", Number(event.target.value))
                    }
                    data-testid="input-profile-age"
                  />
                </Field>
                <Field label="Gender">
                  <VibeSelect
                    value={profile.gender}
                    onChange={(value) => update("gender", value)}
                    options={[
                      "Prefer not to say",
                      "Woman",
                      "Man",
                      "Non-binary",
                    ]}
                    placeholder="Choose gender"
                    testId="select-profile-gender"
                  />
                </Field>
                <Field label="State">
                  <VibeSelect
                    value={profile.state}
                    onChange={(value) => {
                      update("state", value);
                      if (!districtsForState(value).includes(profile.district))
                        update("district", "");
                    }}
                    options={states}
                    placeholder="Choose state"
                    testId="select-profile-state"
                  />
                </Field>
                <Field label="District">
                  <VibeSelect
                    value={profile.district}
                    onChange={(value) => update("district", value)}
                    options={districtsForState(profile.state)}
                    placeholder={
                      profile.state ? "Choose district" : "Choose state first"
                    }
                    testId="select-profile-district"
                    disabled={!profile.state}
                  />
                </Field>
                <Field label="Social category">
                  <VibeSelect
                    value={profile.category}
                    onChange={(value) => update("category", value)}
                    options={["General", "SC", "ST", "OBC", "EWS"]}
                    placeholder="Choose category"
                    testId="select-profile-category"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section
            className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-8"
            data-testid="section-profile-situation"
          >
            <div className="mb-6">
              <SectionKicker>Situation</SectionKicker>
              <h2 className="font-display text-2xl font-bold">
                Make the match more useful
              </h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                These details help Nagarik compare rules and prepare a
                document-first plan.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Occupation">
                <input
                  className={inputClass}
                  value={profile.occupation}
                  onChange={(event) => update("occupation", event.target.value)}
                  placeholder="e.g. Farmer, tailor, student"
                  data-testid="input-profile-occupation"
                />
              </Field>
              <Field label="Annual household income">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={profile.annualIncome || ""}
                  onChange={(event) =>
                    update("annualIncome", Number(event.target.value))
                  }
                  placeholder="₹ 0"
                  data-testid="input-profile-income"
                />
              </Field>
              <Field label="Family members">
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={20}
                  value={profile.familySize}
                  onChange={(event) =>
                    update("familySize", Number(event.target.value))
                  }
                  data-testid="input-profile-family-size"
                />
              </Field>
              <Field label="Employment status">
                <VibeSelect
                  value={profile.employmentStatus}
                  onChange={(value) => update("employmentStatus", value)}
                  options={[
                    "Unemployed",
                    "Self-employed",
                    "Salaried",
                    "Casual worker",
                    "Retired",
                  ]}
                  placeholder="Choose employment"
                />
              </Field>
              <Field label="Housing">
                <VibeSelect
                  value={profile.housingStatus}
                  onChange={(value) => update("housingStatus", value)}
                  options={[
                    "Renting",
                    "Own home",
                    "Homeless",
                    "Temporary housing",
                  ]}
                  placeholder="Choose housing"
                />
              </Field>
              <Field label="Marital status">
                <VibeSelect
                  value={profile.maritalStatus}
                  onChange={(value) => update("maritalStatus", value)}
                  options={["Single", "Married", "Widowed", "Separated"]}
                  placeholder="Choose marital status"
                />
              </Field>
              <Field label="Land size (acres)">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={profile.landSize ?? ""}
                  onChange={(event) =>
                    update(
                      "landSize",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  data-testid="input-profile-land-size"
                />
              </Field>
              <Field label="Urgency">
                <VibeSelect
                  value={profile.urgency || "medium"}
                  onChange={(value) => update("urgency", value)}
                  options={["low", "medium", "high"]}
                  placeholder="Choose urgency"
                />
              </Field>
            </div>
            <div className="mt-6 grid gap-3 border-t border-[hsl(var(--border))] pt-6 sm:grid-cols-3">
              {[
                ["studentStatus", "I am a student"],
                ["farmerStatus", "I am a farmer"],
                ["disabilityStatus", "I have a disability"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${profile[key as keyof CitizenProfile] ? "border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.55)]" : "border-[hsl(var(--border))]"}`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(profile[key as keyof CitizenProfile])}
                    onChange={(event) =>
                      update(key as keyof CitizenProfile, event.target.checked)
                    }
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section
            className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-8"
            data-testid="section-profile-documents"
          >
            <div className="mb-6 flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                <FileText size={18} />
              </span>
              <div>
                <SectionKicker>Documents</SectionKicker>
                <h2 className="font-display text-2xl font-bold">
                  What you already have
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Your next checklist will start with what is still missing.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((document) => (
                <label
                  key={document}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm ${profile.availableDocuments.includes(document) ? "border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.55)]" : "border-[hsl(var(--border))]"}`}
                >
                  <input
                    type="checkbox"
                    checked={profile.availableDocuments.includes(document)}
                    onChange={() => toggleDocument(document)}
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  {document}
                </label>
              ))}
            </div>
          </section>

          {(error || notice) && (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]" : "bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"}`}
              role={error ? "alert" : "status"}
              data-testid="profile-status"
            >
              {error || notice}
            </p>
          )}
          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            >
              <ArrowLeft size={16} /> Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              data-testid="button-save-profile"
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}{" "}
              {saving ? "Saving profile" : "Save changes"}
            </button>
          </div>
        </form>

        <section
          className="mt-14 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-8"
          data-testid="section-profile-security"
        >
          <div className="mb-6">
            <SectionKicker>Security</SectionKicker>
            <h2 className="font-display text-2xl font-bold">Account access</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Change the email or password you use to sign in. Passwords are
              handled by Supabase Auth.
            </p>
          </div>
          <form onSubmit={saveSecurity} className="grid gap-5 sm:grid-cols-2">
            <Field label="Email address">
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                data-testid="input-profile-email"
              />
            </Field>
            <div className="hidden sm:block" />
            <Field label="New password">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave blank to keep it"
                data-testid="input-profile-password"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                data-testid="input-profile-confirm-password"
              />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={securitySaving}
                className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] disabled:opacity-60"
                data-testid="button-save-security"
              >
                {securitySaving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}{" "}
                {securitySaving ? "Updating access" : "Update access"}
              </button>
            </div>
          </form>
        </section>

        <section
          className="mt-14 rounded-3xl border border-[hsl(var(--destructive)/.2)] bg-[hsl(var(--destructive)/.04)] p-5 sm:p-8"
          data-testid="section-delete-account"
        >
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <SectionKicker>Account control</SectionKicker>
              <h2 className="font-display text-2xl font-bold">
                Delete your account
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                This permanently removes your Nagarik account and saved profile.
                Your past analyses are not recoverable.
              </p>
            </div>
            <Trash2 className="text-[hsl(var(--destructive))]" size={24} />
          </div>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--destructive)/.45)] px-5 py-3 text-sm font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"
              data-testid="button-delete-account"
            >
              <Trash2 size={16} /> Delete account
            </button>
          ) : (
            <div className="mt-6 rounded-2xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--card))] p-4">
              <p className="text-sm font-bold">
                Are you sure? This cannot be undone.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void removeAccount()}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--destructive))] px-5 py-3 text-sm font-bold text-[hsl(var(--destructive-foreground))] disabled:opacity-60"
                  data-testid="button-confirm-delete"
                >
                  {deleting ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}{" "}
                  {deleting ? "Deleting account" : "Yes, delete permanently"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold"
                  data-testid="button-cancel-delete"
                >
                  <LogOut size={16} /> Keep account
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
