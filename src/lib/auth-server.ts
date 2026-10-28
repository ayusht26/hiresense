import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  session?: unknown;
  user?: unknown;
}

export const serverLoginFn = createServerFn({ method: "POST" })
  .validator((data: unknown): LoginPayload => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid payload");
    }
    const d = data as { identifier?: unknown; password?: unknown };
    if (typeof d.identifier !== "string" || typeof d.password !== "string") {
      throw new Error("Missing identifier or password");
    }
    return { identifier: d.identifier.trim(), password: d.password };
  })
  .handler(async ({ data }): Promise<LoginResult> => {
    const { identifier, password } = data;
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "https://vglqudbftkybegdrqdec.supabase.co";
    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbHF1ZGJmdGt5YmVnZHJxZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODk4NDEsImV4cCI6MjEwODc2NTg0MX0.tiSKoaejfxHCobVZqH7PeooAYTL9qTIJaoiasxfoTJQ";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let emailToUse = identifier;

    if (!identifier.includes("@")) {
      // Username resolution on the server
      if (serviceRoleKey) {
        const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);
        const { data: profile } = await adminClient
          .from("profiles")
          .select("email")
          .ilike("username", identifier)
          .maybeSingle();

        if (profile?.email) {
          emailToUse = profile.email;
        }
      }

      // If service role didn't resolve (e.g. key missing), try RPC via anon client
      if (emailToUse === identifier) {
        const rpcClient = createClient<Database>(supabaseUrl, anonKey);
        const { data: resolvedEmail } = await rpcClient.rpc("get_email_by_username_internal", {
          p_username: identifier,
        });

        if (resolvedEmail) {
          emailToUse = resolvedEmail;
        } else {
          // Fallback for demo/test accounts when offline or database not seeded
          if (identifier.toLowerCase() === "hiresense_recruiter") {
            emailToUse = "hiresense_recruiter@recruiters.hiresense.online";
          } else if (identifier.toLowerCase() === "hiresense_student") {
            emailToUse = "hiresense_student@students.hiresense.online";
          } else if (identifier.toLowerCase() === "student_634581") {
            emailToUse = "hiresense.student.634581@gmail.com";
          } else {
            return { success: false, error: "Invalid credentials." };
          }
        }
      }
    }

    const client = createClient<Database>(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (authError || !authData.session) {
      return { success: false, error: "Invalid credentials." };
    }

    return {
      success: true,
      session: authData.session,
      user: authData.user,
    };
  });
