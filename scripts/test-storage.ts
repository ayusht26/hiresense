import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

const SUPABASE_URL = "https://vglqudbftkybegdrqdec.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbHF1ZGJmdGt5YmVnZHJxZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxODk4NDEsImV4cCI6MjEwODc2NTg0MX0.tiSKoaejfxHCobVZqH7PeooAYTL9qTIJaoiasxfoTJQ";

async function testStorage() {
  console.log("=== STARTING STORAGE & AVATAR TESTS (Test 8) ===");

  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
    email: "hiresense.student.634581@gmail.com",
    password: "TestPassword!123",
  });

  if (signInErr || !signInData.user) {
    console.error("Sign in error:", signInErr);
    process.exit(1);
  }

  const userId = signInData.user.id;
  console.log("Signed in as student:", userId);

  // 1. Upload valid avatar image into avatars/{userId}/avatar.png
  const smallBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const filePath = `${userId}/avatar_test_${Date.now()}.png`;

  console.log("Uploading valid image to:", filePath);
  const { data: uploadData, error: uploadErr } = await client.storage
    .from("avatars")
    .upload(filePath, smallBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadErr) {
    console.error("FAIL: Upload to own avatar folder failed:", uploadErr);
    process.exit(1);
  }
  console.log("PASS: Valid image uploaded successfully to avatars bucket!");

  // Get public URL
  const { data: urlData } = client.storage.from("avatars").getPublicUrl(filePath);
  console.log("Avatar public URL:", urlData.publicUrl);

  // 2. Test unauthorized upload to another user's folder
  const unauthorizedPath = `00000000-0000-0000-0000-000000000000/hack.png`;
  const { error: unauthErr } = await client.storage
    .from("avatars")
    .upload(unauthorizedPath, smallBuffer, {
      contentType: "image/png",
    });

  console.log("Unauthorized upload error (expected):", unauthErr?.message);
  if (!unauthErr) {
    console.error("FAIL: Upload to another user's folder was allowed!");
    process.exit(1);
  }
  console.log("PASS: Upload to another user folder blocked by storage RLS!");

  // 3. Test upload with file size exceeding 2MB limit (2.5 MB)
  const bigBuffer = Buffer.alloc(2.5 * 1024 * 1024, "a");
  const { error: bigErr } = await client.storage
    .from("avatars")
    .upload(`${userId}/too_big.png`, bigBuffer, {
      contentType: "image/png",
    });

  console.log("File exceeding 2MB error (expected):", bigErr?.message);
  if (!bigErr) {
    console.error("FAIL: File > 2MB was allowed!");
    process.exit(1);
  }
  console.log("PASS: File > 2MB rejected by bucket size limit!");

  // Clean up test file
  await client.storage.from("avatars").remove([filePath]);
  console.log("PASS: Test file cleaned up successfully!");

  console.log("\n=== STORAGE TESTS PASSED! ===");
}

testStorage().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

