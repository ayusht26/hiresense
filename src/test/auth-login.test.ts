import { describe, it, expect } from "vitest";
import { resolveUsernameToEmail, supabase } from "@/lib/supabase";

describe("Username Resolution and Auth Login", () => {
  it("resolves username 'varnit' to its registered email", async () => {
    const email = await resolveUsernameToEmail("varnit");
    expect(email).toBe("varnitagustya@gmail.com");
  });

  it("resolves usernames case-insensitively", async () => {
    const emailUpper = await resolveUsernameToEmail("VARNIT");
    expect(emailUpper).toBe("varnitagustya@gmail.com");
  });

  it("returns null for non-existent usernames", async () => {
    const email = await resolveUsernameToEmail("non_existent_user_99999");
    expect(email).toBeNull();
  });

  it("signs in successfully with username 'varnit' via resolved email", async () => {
    const email = await resolveUsernameToEmail("varnit");
    expect(email).toBeTruthy();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email!,
      password: "varnit123#",
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.id).toBe("9e5dafb4-654d-4bf4-b00c-ebba4c3797c0");

    // Clean up session
    await supabase.auth.signOut();
  });

  it("fails authentication when wrong password is provided", async () => {
    const email = await resolveUsernameToEmail("varnit");
    expect(email).toBeTruthy();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email!,
      password: "wrong_password_xyz",
    });

    expect(error).toBeDefined();
    expect(data.session).toBeNull();
  });
});
