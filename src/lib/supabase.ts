import { createBrowserClient } from "@supabase/ssr";
import type { Database, Profile } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vglqudbftkybegdrqdec.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
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
 * Fetch the authenticated user's profile.
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}
