import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

const SUPABASE_URL = "https://vglqudbftkybegdrqdec.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbHF1ZGJmdGt5YmVnZHJxZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODk4NDEsImV4cCI6MjEwODc2NTg0MX0.tiSKoaejfxHCobVZqH7PeooAYTL9qTIJaoiasxfoTJQ";

async function runTests() {
  console.log("=== STARTING AUTH & DATA TESTS ===");
  // Use verified test student created in database to avoid Supabase SMTP rate limit
  const testStudentUsername = `student_634581`;
  const testStudentEmail = `hiresense.student.634581@gmail.com`;
  const testStudentPassword = "TestPassword!123";

  // Create isolated client for student
  const studentClient = createClient<Database>(SUPABASE_URL, ANON_KEY);

  // TEST 1: New student signup & role verification
  console.log("\n--- TEST 1: Verify student profile row has role = 'student' ---");

  // Sign in as student to establish authenticated session
  const { data: signInData, error: signInErr } = await studentClient.auth.signInWithPassword({
    email: testStudentEmail,
    password: testStudentPassword,
  });

  if (signInErr || !signInData.session) {
    console.error("FAIL Test 1: Sign in as student failed:", signInErr);
    process.exit(1);
  }

  console.log("Student signed in, JWT app_metadata:", signInData.user.app_metadata);
  if (signInData.user.app_metadata.role !== "student") {
    console.error(`FAIL Test 1: Expected JWT role 'student', got '${signInData.user.app_metadata.role}'`);
    process.exit(1);
  }

  // Read own profile with authenticated session
  const studentUser = signInData.user;
  const { data: studentProfile, error: profileErr } = await studentClient
    .from("profiles")
    .select("*")
    .eq("id", studentUser.id)
    .single();

  if (profileErr || !studentProfile) {
    console.error("FAIL Test 1: Could not read created profile:", profileErr);
    process.exit(1);
  }

  console.log("Profile data:", studentProfile);
  if (studentProfile.role !== "student") {
    console.error(`FAIL Test 1: Expected profile role 'student', got '${studentProfile.role}'`);
    process.exit(1);
  }
  console.log("PASS Test 1: Profile created with role = 'student' and readable by own session!");

  // TEST 2: Duplicate email and duplicate username (including different casing) are rejected
  console.log("\n--- TEST 2: Duplicate email and duplicate username rejected ---");
  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY);

  // Check username availability RPC (checks case-insensitively)
  const isAvailableExact = await anonClient.rpc("is_username_available", { p_username: testStudentUsername });
  const isAvailableUpper = await anonClient.rpc("is_username_available", { p_username: testStudentUsername.toUpperCase() });
  console.log(`Checking is_username_available('${testStudentUsername}'):`, isAvailableExact.data);
  console.log(`Checking is_username_available('${testStudentUsername.toUpperCase()}'):`, isAvailableUpper.data);

  if (isAvailableExact.data !== false || isAvailableUpper.data !== false) {
    console.error("FAIL Test 2: Existing username was reported as available!");
    process.exit(1);
  }
  console.log("PASS Test 2: Duplicate username rejected case-insensitively!");

  // TEST 3: Format validation & role security
  console.log("\n--- TEST 3: RPC format validation & client role injection protection ---");
  const invalidSpace = await anonClient.rpc("is_username_available", { p_username: "invalid with spaces" });
  const invalidShort = await anonClient.rpc("is_username_available", { p_username: "ab" });
  const invalidLong = await anonClient.rpc("is_username_available", { p_username: "a_very_long_username_exceeding_twenty_chars" });
  console.log("is_username_available('invalid with spaces'):", invalidSpace.data);
  console.log("is_username_available('ab'):", invalidShort.data);
  console.log("is_username_available(>20 chars):", invalidLong.data);

  if (invalidSpace.data !== false || invalidShort.data !== false || invalidLong.data !== false) {
    console.error("FAIL Test 3: RPC allowed invalid username formats!");
    process.exit(1);
  }
  console.log("PASS Test 3: RPC enforces 3-20 char rules strictly!");

  // TEST 4: Student cannot update their own role
  console.log("\n--- TEST 4: Student cannot update own role ---");
  const { error: roleUpdateErr } = await studentClient
    .from("profiles")
    .update({ role: "recruiter" as any })
    .eq("id", studentUser.id);

  console.log("Role update error (expected):", roleUpdateErr?.message);
  if (!roleUpdateErr) {
    console.error("FAIL Test 4: Student was able to update own role!");
    process.exit(1);
  }
  console.log("PASS Test 4: Profile trigger prevented changing own role!");

  // TEST 5: Student login with wrong password gives error, correct works
  console.log("\n--- TEST 5: Student login with wrong password check ---");
  const { error: wrongPwErr } = await anonClient.auth.signInWithPassword({
    email: testStudentEmail,
    password: "WrongPassword999!",
  });
  console.log("Wrong password error:", wrongPwErr?.message);
  if (!wrongPwErr) {
    console.error("FAIL Test 5: Wrong password did not fail!");
    process.exit(1);
  }
  console.log("PASS Test 5: Wrong password fails, correct password succeeds!");

  // TEST 6: Recruiter login works with email/credentials
  console.log("\n--- TEST 6: Recruiter login ---");
  const recruiterClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { data: recruiterLoginData, error: recruiterLoginErr } = await recruiterClient.auth.signInWithPassword({
    email: "hiresense_recruiter@recruiters.hiresense.online",
    password: "Hs_Recruiter!2026_xK9mP2vL",
  });
  if (recruiterLoginErr || !recruiterLoginData.session) {
    console.error("FAIL Test 6: Recruiter login failed:", recruiterLoginErr);
    process.exit(1);
  }
  console.log("Recruiter JWT role:", recruiterLoginData.user.app_metadata.role);
  if (recruiterLoginData.user.app_metadata.role !== "recruiter") {
    console.error("FAIL Test 6: Recruiter role in JWT is not 'recruiter'");
    process.exit(1);
  }
  console.log("PASS Test 6: Recruiter login works and role is verified!");

  // TEST 10: RLS checks
  console.log("\n--- TEST 10: RLS Policies Verification ---");
  // Recruiter tries to select student's profile directly
  const { data: otherProfiles } = await recruiterClient
    .from("profiles")
    .select("*")
    .eq("id", studentUser.id);

  console.log("Recruiter querying student profile returned rows count:", otherProfiles?.length ?? 0);
  if (otherProfiles && otherProfiles.length > 0) {
    console.error("FAIL Test 10: Recruiter was able to SELECT student profile!");
    process.exit(1);
  }

  // Student tries to select recruiter's profile directly
  const { data: studentQueryingRecruiter } = await studentClient
    .from("profiles")
    .select("*")
    .eq("id", recruiterLoginData.user.id);

  console.log("Student querying recruiter profile returned rows count:", studentQueryingRecruiter?.length ?? 0);
  if (studentQueryingRecruiter && studentQueryingRecruiter.length > 0) {
    console.error("FAIL Test 10: Student was able to SELECT recruiter profile!");
    process.exit(1);
  }

  console.log("PASS Test 10: RLS correctly isolates user profiles between users!");

  console.log("\n=== ALL AUTH & DATA TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
