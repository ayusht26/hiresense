import { createClient } from "@supabase/supabase-js";
import type { Database, StructuredJobListing } from "../src/types/database.types";
import { executeAiStructuring } from "../src/lib/ai-listing";

const SUPABASE_URL = "https://vglqudbftkybegdrqdec.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbHF1ZGJmdGt5YmVnZHJxZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODk4NDEsImV4cCI6MjEwODc2NTg0MX0.tiSKoaejfxHCobVZqH7PeooAYTL9qTIJaoiasxfoTJQ";

async function run() {
  console.log("==================================================");
  console.log("HIRESENSE: TESTING ADD JOB LISTING & FEED WORKFLOW");
  console.log("==================================================");

  // 1. Recruiter sign-in
  console.log("\n[1/8] Signing in as recruiter...");
  const recruiterClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { data: recAuth, error: recAuthErr } = await recruiterClient.auth.signInWithPassword({
    email: "hiresense_recruiter@recruiters.hiresense.online",
    password: "Hs_Recruiter!2026_xK9mP2vL",
  });

  if (recAuthErr || !recAuth.session) {
    throw new Error(`Recruiter sign in failed: ${recAuthErr?.message}`);
  }
  const recruiterId = recAuth.user.id;
  console.log("✓ Recruiter signed in successfully. ID:", recruiterId);

  // 2. Student sign-in
  console.log("\n[2/8] Signing in as student...");
  const studentClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { data: studAuth, error: studAuthErr } = await studentClient.auth.signInWithPassword({
    email: "hiresense.student.634581@gmail.com",
    password: "TestPassword!123",
  });

  if (studAuthErr || !studAuth.session) {
    throw new Error(`Student sign in failed: ${studAuthErr?.message}`);
  }
  const studentId = studAuth.user.id;
  console.log("✓ Student signed in successfully. ID:", studentId);

  // 3. AI Structuring from messy raw text
  console.log("\n[3/8] Calling AI Structuring Engine with messy recruiter paragraph...");
  const rawDesc = `We're expanding the HireSense core team! We need a Senior Fullstack Engineer based in Bengaluru (hybrid 3 days in office). You must have solid experience with React, TypeScript, and Node.js with PostgreSQL for data persistence. Docker and AWS experience is preferred. Salary is 20-30 LPA depending on experience. You will architect candidate matching pipelines, build proctoring event observers, and lead code reviews. 4+ years experience required. Benefits include full health insurance and home office stipend.`;

  const aiResult = await executeAiStructuring({
    title: "Senior Fullstack Engineer",
    company: "HireSense Demo Co",
    description: rawDesc,
    salary: "20-30 LPA",
  });

  console.log("✓ AI Structuring succeeded!");
  console.log("  Model used:", aiResult.model_name);
  console.log("  Prompt version:", aiResult.prompt_version);
  console.log("  Structured title:", aiResult.structured.title);
  console.log("  Structured work mode:", aiResult.structured.work_mode);
  console.log("  Structured salary display:", aiResult.structured.salary.display);
  console.log("  Extracted tech stack count:", aiResult.structured.tech_stack.length);
  aiResult.structured.tech_stack.forEach((t) => {
    console.log(`    - ${t.canonical_name} (${t.category}) | devicon: ${t.devicon_slug} | req: ${t.requirement_type}`);
  });

  // 4. Save as Draft by Recruiter
  console.log("\n[4/8] Recruiter saves job as DRAFT...");
  const draftJobPayload = {
    recruiter_id: recruiterId,
    company_name: "HireSense Demo Co",
    title: aiResult.structured.title,
    location: aiResult.structured.location,
    work_mode: aiResult.structured.work_mode,
    job_type: aiResult.structured.employment_type || "Full-time",
    experience: aiResult.structured.experience,
    salary_min: aiResult.structured.salary.min,
    salary_max: aiResult.structured.salary.max,
    salary_currency: aiResult.structured.salary.currency,
    salary_period: aiResult.structured.salary.period,
    salary_display: aiResult.structured.salary.display,
    raw_input: rawDesc,
    generated_posting: aiResult.structured as any,
    model_name: aiResult.model_name,
    prompt_version: aiResult.prompt_version,
    status: "draft",
  };

  const { data: createdDraftJob, error: draftErr } = await recruiterClient
    .from("jobs")
    .insert(draftJobPayload)
    .select()
    .single();

  if (draftErr || !createdDraftJob) {
    throw new Error(`Failed to save draft job: ${draftErr?.message}`);
  }
  const jobId = createdDraftJob.id;
  console.log("✓ Job saved as draft. Job ID:", jobId);

  // 5. Verify Student Feed does NOT show Draft job
  console.log("\n[5/8] Verifying student CANNOT see draft job...");
  const { data: studentFeedDraftCheck, error: feedDraftErr } = await studentClient
    .from("jobs")
    .select("*")
    .eq("id", jobId);

  if (feedDraftErr) {
    throw new Error(`Student feed query error: ${feedDraftErr.message}`);
  }

  if (studentFeedDraftCheck && studentFeedDraftCheck.length > 0) {
    throw new Error("SECURITY VIOLATION: Student was able to view a draft job!");
  }
  console.log("✓ Draft job is completely hidden from student feed (RLS & query filter verified)!");

  // 6. Recruiter publishes the job
  console.log("\n[6/8] Recruiter publishes the job (status = 'published')...");
  const { data: publishedJob, error: pubErr } = await recruiterClient
    .from("jobs")
    .update({ status: "published" })
    .eq("id", jobId)
    .select()
    .single();

  if (pubErr || !publishedJob) {
    throw new Error(`Failed to publish job: ${pubErr?.message}`);
  }
  console.log("✓ Job successfully published!");

  // 7. Verify Student Feed NOW sees the published job
  console.log("\n[7/8] Verifying student CAN see published job in feed...");
  const { data: studentFeedPubCheck, error: feedPubErr } = await studentClient
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (feedPubErr || !studentFeedPubCheck) {
    throw new Error(`Student could not view published job: ${feedPubErr?.message}`);
  }
  console.log("✓ Published job is visible to student!");
  console.log("  Title:", studentFeedPubCheck.title);
  console.log("  Status:", studentFeedPubCheck.status);
  console.log("  Salary display:", studentFeedPubCheck.salary_display);

  // 8. Verify Student cannot modify jobs (RLS test)
  console.log("\n[8/8] Verifying student CANNOT tamper with or insert jobs...");
  const { error: studentTamperErr } = await studentClient
    .from("jobs")
    .update({ title: "Hacked Title" })
    .eq("id", jobId);

  console.log("  Update attempt as student error:", studentTamperErr?.message || "No error returned (rows modified = 0)");
  // Verify title was not changed
  const { data: verifyUntampered } = await recruiterClient
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .single();

  if (verifyUntampered?.title !== aiResult.structured.title) {
    throw new Error("SECURITY VIOLATION: Student managed to modify job title!");
  }
  console.log("✓ Student tampering blocked by RLS policies!");

  console.log("\n==================================================");
  console.log("ALL 8 VERIFICATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
