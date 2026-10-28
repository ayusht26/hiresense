import { createBrowserClient } from "@supabase/ssr";
import type { Database, Profile } from "@/types/database.types";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  "https://vglqudbftkybegdrqdec.supabase.co";

const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbHF1ZGJmdGt5YmVnZHJxZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODk4NDEsImV4cCI6MjEwODc2NTg0MX0.tiSKoaejfxHCobVZqH7PeooAYTL9qTIJaoiasxfoTJQ";

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabase() {
  if (typeof window === "undefined") {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}

export const supabase = getSupabase();

/**
 * Checks whether a given username is valid and available case-insensitively.
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed || !/^[a-zA-Z0-9_.]{3,20}$/.test(trimmed)) {
    return false;
  }

  const { data, error } = await supabase.rpc("is_username_available", {
    p_username: trimmed,
  });

  if (error) {
    console.error("is_username_available error:", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Resolves a username to its associated email address.
 * Case-insensitive lookup via database function.
 */
export async function resolveUsernameToEmail(username: string): Promise<string | null> {
  const trimmed = username.trim();
  if (!trimmed) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_email_by_username_internal", {
    p_username: trimmed,
  });

  if (error || !data) {
    return null;
  }

  return data as string;
}

/**
 * Fetch the authenticated user's profile.
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}
