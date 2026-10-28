import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/hs/AuthLayout";
import { ProgressIndicator, StepActions } from "@/components/ui/progress-indicator";
import { FileUpload } from "@/components/ui/file-upload";
import { supabase, fetchUserProfile } from "@/lib/supabase";
import type { Profile } from "@/types/database.types";

export const Route = createFileRoute("/signup_/photo")({
  head: () => ({
    meta: [
      { title: "Profile photo — HireSense" },
      {
        name: "description",
        content: "Add a profile photo to your HireSense account.",
      },
    ],
  }),
  component: SignupPhotoPage,
});

function SignupPhotoPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function checkAuthAndProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate({ to: "/login" });
          return;
        }

        const userProfile = await fetchUserProfile(user.id);
        if (!userProfile) {
          navigate({ to: "/login" });
          return;
        }

        // Non-students or users who already completed photo step proceed directly to /dashboard
        if (userProfile.role !== "student" || userProfile.avatar_step_done) {
          navigate({ to: "/dashboard" });
          return;
        }

        setProfile(userProfile);
      } catch (err) {
        console.error("Auth check error:", err);
        navigate({ to: "/login" });
      } finally {
        setIsInitializing(false);
      }
    }

    checkAuthAndProfile();
  }, [navigate]);

  const handleFinishUpload = async () => {
    if (!selectedFile || !profile) return;

    setUploading(true);
    setError(null);

    try {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
      const fileName = `${Date.now()}.${cleanExt}`;
      const filePath = `${profile.id}/${fileName}`;

      // Upload to avatars bucket
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        setError("Failed to upload image. Please try again.");
        setUploading(false);
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          avatar_step_done: true,
        })
        .eq("id", profile.id);

      if (updateErr) {
        console.error("Profile update error:", updateErr);
        setError("Failed to update profile. Please try again.");
        setUploading(false);
        return;
      }

      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Finish error:", err);
      setError("An unexpected error occurred. Please try again.");
      setUploading(false);
    }
  };

  const handleSkip = async () => {
    if (!profile) return;

    setUploading(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          avatar_step_done: true,
        })
        .eq("id", profile.id);

      if (updateErr) {
        console.error("Skip update error:", updateErr);
        setError("Failed to update profile. Please try again.");
        setUploading(false);
        return;
      }

      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Skip error:", err);
      setError("An unexpected error occurred. Please try again.");
      setUploading(false);
    }
  };

  if (isInitializing || !profile) {
    return (
      <AuthLayout>
        <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-12 text-center">
          <p className="text-[14px] text-[#8a8a8a]">Loading your profile...</p>
        </div>
      </AuthLayout>
    );
  }

  const isReturningUser =
    profile.created_at && Date.now() - new Date(profile.created_at).getTime() > 60000;
  const headingText = isReturningUser ? "One last thing." : "Add a profile photo.";

  return (
    <AuthLayout>
      <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-8 sm:p-10 transition-all">
        {/* Progress Indicator */}
        <div className="mb-6">
          <ProgressIndicator step={3} totalSteps={3} />
        </div>

        {/* Wizard Header */}
        <div className="mb-8">
          <h1 className="text-[36px] font-[650] leading-[1.05] tracking-tight text-[#f5f5f5]">
            {headingText}
          </h1>
          <p className="mt-2 text-[18px] font-[300] leading-[1.38] text-[#8a8a8a]">
            Step 3 of 3 · Add a photo to help interviewers recognize you.
          </p>
        </div>

        {/* File Upload Component */}
        <div className="space-y-6">
          <FileUpload
            value={selectedFile}
            onFileSelect={setSelectedFile}
            acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
            maxFileSize={2 * 1024 * 1024}
            circularPreview={true}
            disabled={uploading}
            error={error || undefined}
          />

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <StepActions
              step={3}
              totalSteps={3}
              canGoBack={false} // Back is NOT available on step 3 (account exists)
              disabled={!selectedFile || uploading}
              loading={uploading}
              finishLabel="Finish"
              onContinue={handleFinishUpload}
            />

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSkip}
                disabled={uploading}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.10)] px-6 text-[14px] font-[600] text-[#f5f5f5] transition-colors hover:bg-[#262626] active:scale-[0.98] disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
