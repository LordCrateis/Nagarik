import { useEffect, useState } from "react";
import type { CitizenProfile } from "@workspace/api-client-react";
import type { AnalysisResult } from "@workspace/api-client-react";
import { CitizenProfileUrgency } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

const LEGACY_KEYS = ["nagarik-accounts", "nagarik-session", "nagarik-profile"];

export const emptyProfile: CitizenProfile = {
  name: "",
  age: 28,
  gender: "Prefer not to say",
  state: "",
  district: "",
  occupation: "",
  annualIncome: 0,
  familySize: 1,
  category: "General",
  disabilityStatus: false,
  studentStatus: false,
  employmentStatus: "Unemployed",
  farmerStatus: false,
  housingStatus: "Renting",
  maritalStatus: "Single",
  landSize: null,
  urgency: CitizenProfileUrgency.medium,
  availableDocuments: [],
};

export type NagarikSession = {
  id: string;
  email: string;
  name: string;
  profile: CitizenProfile;
  avatarUrl?: string;
};

function configuredClient() {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Add the Nagarik Supabase URL and publishable key to .env, then restart the app.",
    );
  return supabase;
}

function profileFromMetadata(metadata: unknown): CitizenProfile {
  const profile =
    metadata && typeof metadata === "object"
      ? (metadata as { profile?: unknown }).profile
      : null;
  return profile && typeof profile === "object"
    ? { ...emptyProfile, ...(profile as Partial<CitizenProfile>) }
    : { ...emptyProfile };
}

type AuthUser = { id: string; email?: string; user_metadata?: unknown };

function sessionFromUser(
  user: AuthUser | null,
  profile: CitizenProfile,
): NagarikSession | null {
  if (!user?.email) return null;
  const metadata = user.user_metadata && typeof user.user_metadata === "object"
    ? (user.user_metadata as { avatarUrl?: unknown })
    : {};
  return {
    id: user.id,
    email: user.email,
    name: profile.name,
    profile,
    avatarUrl: typeof metadata.avatarUrl === "string" ? metadata.avatarUrl : undefined,
  };
}

async function profileFromTable(user: AuthUser): Promise<CitizenProfile> {
  const fallback = profileFromMetadata(user.user_metadata);
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from("citizen_profiles")
    .select("profile")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data?.profile || typeof data.profile !== "object")
    return fallback;
  return { ...emptyProfile, ...(data.profile as Partial<CitizenProfile>) };
}

async function saveProfileToTable(userId: string, profile: CitizenProfile) {
  const { error } = await configuredClient().from("citizen_profiles").upsert({
    user_id: userId,
    profile,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

function clearLegacyBrowserAuth() {
  LEGACY_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function useAuthSession() {
  const [session, setSession] = useState<NagarikSession | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    clearLegacyBrowserAuth();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!error && data.user) {
        const profile = await profileFromTable(data.user);
        setSession(sessionFromUser(data.user, profile));
        if (!profileFromMetadata(data.user.user_metadata).name && profile.name)
          await saveProfileToTable(data.user.id, profile);
      } else {
        setSession(null);
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!nextSession?.user) {
          setSession(null);
          setLoading(false);
          return;
        }
        void profileFromTable(nextSession.user).then((profile) => {
          setSession(sessionFromUser(nextSession.user, profile));
          setLoading(false);
        });
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export async function createAccount(
  email: string,
  password: string,
  profile: CitizenProfile,
) {
  clearLegacyBrowserAuth();
  const { data, error } = await configuredClient().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { profile }, emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
  if (data.session && data.user)
    await saveProfileToTable(data.user.id, profile);
  return { requiresEmailConfirmation: !data.session };
}

export async function logIn(email: string, password: string) {
  clearLegacyBrowserAuth();
  const { error } = await configuredClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error("The email or password is incorrect.");
}

export async function logOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function updateStoredProfile(profile: CitizenProfile) {
  const { data, error } = await configuredClient().auth.getUser();
  if (error || !data.user)
    throw new Error(
      error?.message ?? "Your session has expired. Please log in again.",
    );
  await saveProfileToTable(data.user.id, profile);
}

/** Persist a signed-in person's latest result and application checklist.
 * Analyses for "Someone else" deliberately stay in the browser session only. */
export async function saveLatestAnalysis(analysis: AnalysisResult) {
  const client = configuredClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return;
  const { error: saveError } = await client.from("benefit_analyses").upsert({
    user_id: data.user.id,
    analysis,
    updated_at: new Date().toISOString(),
  });
  if (saveError) throw new Error(saveError.message);
}

export async function loadLatestAnalysis(): Promise<AnalysisResult | null> {
  if (!supabase) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await supabase
    .from("benefit_analyses")
    .select("analysis")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error || !data?.analysis || typeof data.analysis !== "object") return null;
  return data.analysis as AnalysisResult;
}

export async function uploadProfilePhoto(file: File) {
  const client = configuredClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new Error(error?.message ?? "Your session has expired. Please log in again.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");

  const path = `${data.user.id}/avatar`;
  const upload = await client.storage.from("profile-photos").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (upload.error) throw new Error(upload.error.message);
  const avatarUrl = `${client.storage.from("profile-photos").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const metadata = typeof data.user.user_metadata === "object" && data.user.user_metadata ? data.user.user_metadata : {};
  const updated = await client.auth.updateUser({ data: { ...metadata, avatarUrl } });
  if (updated.error) throw new Error(updated.error.message);
  return avatarUrl;
}

export async function deleteAccount() {
  const client = configuredClient();
  const { error } = await client.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  await client.auth.signOut();
}

export async function updateEmail(email: string) {
  const { error } = await configuredClient().auth.updateUser({ email: email.trim() });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const { error } = await configuredClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
