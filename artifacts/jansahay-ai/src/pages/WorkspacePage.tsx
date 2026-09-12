import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CitizenProfile } from "@workspace/api-client-react";
import {
  useAnalyzeBenefits,
  useSaveCitizenProfile,
} from "@workspace/api-client-react";
import { BrandMark } from "@/components/BrandMark";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VibeSelect } from "@/components/VibeSelect";
import { ProcessingNotice, SectionKicker } from "@/components/Primitives";
import { emptyProfile, saveLatestAnalysis, updateStoredProfile, useAuthSession } from "@/lib/auth";
import { districtsForState, states } from "@/lib/location-options";

const documents = [
  "Aadhaar / identity proof",
  "Income certificate",
  "Residence proof",
  "Bank account details",
  "Caste certificate",
  "Disability certificate",
  "Land ownership record",
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
        {label}
        {hint && (
          <span title={hint} className="text-[hsl(var(--muted-foreground))]">
            <CircleHelp size={13} />
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]";

export default function WorkspacePage() {
  const [, setLocation] = useLocation();
  const save = useSaveCitizenProfile();
  const analyze = useAnalyzeBenefits();
  const { session, loading: authLoading } = useAuthSession();
  const [profile, setProfile] = useState<CitizenProfile>({ ...emptyProfile });
  const [activeStep, setActiveStep] = useState(1);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState<"self" | "other">("self");

  useEffect(() => {
    document
      .getElementById("benefit-check-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  useEffect(() => {
    if (!authLoading && !session) setLocation("/login");
    if (session && subject === "self") setProfile(session.profile);
  }, [authLoading, session, setLocation, subject]);

  const update = (
    key: keyof CitizenProfile,
    value: string | number | boolean | null,
  ) => setProfile((current) => ({ ...current, [key]: value }));
  const setDocument = (document: string) =>
    setProfile((current) => ({
      ...current,
      availableDocuments: current.availableDocuments.includes(document)
        ? current.availableDocuments.filter((item) => item !== document)
        : [...current.availableDocuments, document],
    }));
  const selectSubject = (nextSubject: "self" | "other") => {
    setSubject(nextSubject);
    setProfile(
      nextSubject === "self"
        ? { ...(session?.profile ?? emptyProfile) }
        : { ...emptyProfile },
    );
    setActiveStep(1);
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (
      !profile.name.trim() ||
      !profile.state.trim() ||
      !profile.district.trim()
    ) {
      setError(
        "Please add your name, state, and district so the analysis has enough context.",
      );
      setActiveStep(1);
      return;
    }
    const analyzeSubmittedProfile = () => {
      analyze.mutate(
        { data: profile },
        {
          onSuccess: (result) => {
            sessionStorage.setItem("nagarik-analysis", JSON.stringify(result));
            if (subject === "self") void saveLatestAnalysis(result).catch(() => undefined);
            setLocation("/app/results");
          },
          onError: (analysisError) =>
            setError(
              "Analysis is temporarily unavailable. Your details are still here — wait a moment and try again.",
            ),
        },
      );
    };

    if (subject === "other") {
      analyzeSubmittedProfile();
      return;
    }

    save.mutate(
      { data: profile },
      {
        onSuccess: (saved) => {
          updateStoredProfile(saved.profile);
          analyzeSubmittedProfile();
        },
        onError: () =>
          setError(
            "We could not save this profile. Please check your connection and try again.",
          ),
      },
    );
  };

  const pending = save.isPending || analyze.isPending;
  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" data-testid="link-back-home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="hidden sm:inline">Private to this session</span>
            <LanguageSwitcher />
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 font-semibold text-[hsl(var(--primary))] hover:underline"
              data-testid="link-workspace-profile"
            >
              <ProfileAvatar
                name={session?.name ?? ""}
                avatarUrl={session?.avatarUrl}
                size="size-7"
              />{" "}
              Profile
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <SectionKicker>{"Benefit navigator"}</SectionKicker>
            <h1 className="font-display text-4xl font-bold tracking-[-.045em] sm:text-5xl">
              Let’s start with
              <br />
              <span className="text-[hsl(var(--primary))]">
                your situation.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Answer what you know. Nagarik will explain what may fit — not just
              return a list of names.
            </p>
          </div>
        </div>
        <div
          className="mb-8 grid gap-3 sm:max-w-xl sm:grid-cols-2"
          role="group"
          aria-label="Who is this check for"
        >
          {(
            [
              ["self", "Myself", "Use and update my saved profile"],
              ["other", "For Someone Else", "Enter their details for this check"],
            ] as const
          ).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              onClick={() => selectSubject(value)}
              className={`rounded-2xl border p-4 text-left transition-colors ${subject === value ? "border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.6)]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--accent))]"}`}
              aria-pressed={subject === value}
              data-testid={`button-subject-${value}`}
            >
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                {description}
              </span>
            </button>
          ))}
        </div>
        <div className="mb-8 grid grid-cols-2 gap-2 sm:max-w-md">
          {["Situation", "Documents"].map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(index + 1)}
              className={`group flex items-center gap-2 border-b-2 pb-3 text-left text-sm font-semibold transition-colors ${activeStep === index + 1 ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]" : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"}`}
              data-testid={`button-step-${index + 1}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-xs ${activeStep === index + 1 ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-[hsl(var(--muted))]"}`}
              >
                {index + 1}
              </span>
              {step}
            </button>
          ))}
        </div>
        <form
          id="benefit-check-form"
          onSubmit={submit}
          className="grid gap-8 lg:grid-cols-[1fr_300px]"
        >
          <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_12px_40px_hsl(var(--primary)/.04)] sm:p-8">
            {activeStep === 1 && (
              <div className="animate-rise-in space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    {subject === "self" ? "Your situation" : "Their situation"}
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {subject === "self"
                      ? "Your saved account details will be used for this check."
                      : "Enter their details so we can check the right benefits for them."}
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {subject === "other" && (
                    <>
                      <Field label="Full name">
                        <input
                          className={inputClass}
                          value={profile.name}
                          onChange={(e) => update("name", e.target.value)}
                          placeholder="e.g. Asha Kumari"
                          data-testid="input-name"
                        />
                      </Field>
                      <Field label="Age">
                        <input
                          className={inputClass}
                          type="number"
                          min={0}
                          max={120}
                          value={profile.age}
                          onChange={(e) =>
                            update("age", Number(e.target.value))
                          }
                          data-testid="input-age"
                        />
                      </Field>
                      <Field label="State">
                        <VibeSelect
                          value={profile.state}
                          onChange={(value) => {
                            update("state", value);
                            if (
                              !districtsForState(value).includes(
                                profile.district,
                              )
                            )
                              update("district", "");
                          }}
                          options={states}
                          placeholder="Choose state"
                          testId="select-state"
                        />
                      </Field>
                      <Field label="District">
                        <VibeSelect
                          value={profile.district}
                          onChange={(value) => update("district", value)}
                          options={districtsForState(profile.state)}
                          placeholder={
                            profile.state
                              ? "Choose district"
                              : "Choose state first"
                          }
                          testId="select-district"
                          disabled={!profile.state}
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
                          testId="select-gender"
                        />
                      </Field>
                      <Field label="Social category">
                        <VibeSelect
                          value={profile.category}
                          onChange={(value) => update("category", value)}
                          options={["General", "SC", "ST", "OBC", "EWS"]}
                          placeholder="Choose category"
                          testId="select-category"
                        />
                      </Field>
                    </>
                  )}
                  <Field label="Occupation">
                    <input
                      className={inputClass}
                      value={profile.occupation}
                      onChange={(e) => update("occupation", e.target.value)}
                      placeholder="e.g. Tailor, student, farmer"
                      data-testid="input-occupation"
                    />
                  </Field>
                  <Field
                    label="Annual household income"
                    hint="Use your best estimate in rupees."
                  >
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={profile.annualIncome || ""}
                      onChange={(e) =>
                        update("annualIncome", Number(e.target.value))
                      }
                      placeholder="₹ 0"
                      data-testid="input-income"
                    />
                  </Field>
                  <Field label="Family members">
                    <input
                      className={inputClass}
                      type="number"
                      min={1}
                      max={20}
                      value={profile.familySize}
                      onChange={(e) =>
                        update("familySize", Number(e.target.value))
                      }
                      data-testid="input-family-size"
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
                      testId="select-employment"
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
                      testId="select-housing"
                    />
                  </Field>
                  <Field label="Marital status">
                    <VibeSelect
                      value={profile.maritalStatus}
                      onChange={(value) => update("maritalStatus", value)}
                      options={["Single", "Married", "Widowed", "Separated"]}
                      placeholder="Choose marital status"
                      testId="select-marital"
                    />
                  </Field>
                </div>
              </div>
            )}
            {activeStep === 2 && (
              <div className="animate-rise-in space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    Documents you have
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    No uploads needed. Tick what is already within reach.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {documents.map((document) => (
                    <label
                      key={document}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-all ${profile.availableDocuments.includes(document) ? "border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.55)]" : "border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]"}`}
                    >
                      <span
                        className={`grid size-5 place-items-center rounded-md border ${profile.availableDocuments.includes(document) ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "border-[hsl(var(--input))]"}`}
                      >
                        <input
                          type="checkbox"
                          checked={profile.availableDocuments.includes(
                            document,
                          )}
                          onChange={() => setDocument(document)}
                          className="sr-only"
                          data-testid={`checkbox-document-${document}`}
                        />
                        {profile.availableDocuments.includes(document) && (
                          <Check size={13} strokeWidth={3} />
                        )}
                      </span>
                      {document}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && (
              <p
                className="mt-6 rounded-xl bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"
                data-testid="text-form-error"
              >
                {error}
              </p>
            )}
            <div className="mt-9 flex flex-col-reverse justify-between gap-3 border-t border-[hsl(var(--border))] pt-6 sm:flex-row">
              <button
                type="button"
                onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-40"
                disabled={activeStep === 1 || pending}
                data-testid="button-previous-step"
              >
                <ArrowLeft size={16} /> Previous
              </button>
              {activeStep < 2 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveStep(2);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
                  data-testid="button-next-step"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-70"
                  data-testid="button-analyze"
                >
                  {pending ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />{" "}
                      Building your plan
                    </>
                  ) : (
                    <>
                      Find my possible benefits <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                  <Sparkles size={16} />
                </span>{" "}
                What you’ll get
              </div>
              <ul className="mt-5 space-y-4 text-sm text-[hsl(var(--muted-foreground))]">
                <li className="flex gap-2">
                  <Check
                    size={16}
                    className="shrink-0 text-[hsl(var(--primary))]"
                  />
                  A clear eligibility readout
                </li>
                <li className="flex gap-2">
                  <Check
                    size={16}
                    className="shrink-0 text-[hsl(var(--primary))]"
                  />
                  Compatible benefit bundle
                </li>
                <li className="flex gap-2">
                  <Check
                    size={16}
                    className="shrink-0 text-[hsl(var(--primary))]"
                  />
                  Documents to find first
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]">
              <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">
                Your information
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--primary-foreground)/.75)]">
                Your information stays private in this session and is used only
                to create your analysis.
              </p>
            </div>
            {pending && <ProcessingNotice />}
          </aside>
        </form>
      </main>
    </div>
  );
}
