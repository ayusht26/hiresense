import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LogOut, Building } from "lucide-react";
import { supabase, fetchUserProfile } from "@/lib/supabase";
import type { Profile } from "@/types/database.types";

export const Route = createFileRoute("/recruiter")({
  head: () => ({
    meta: [
      { title: "Recruiter Workspace — HireSense" },
      {
        name: "description",
        content: "HireSense Recruiter Workspace.",
      },
    ],
  }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecruiter() {
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

        // If student accessed recruiter page, redirect to student
        if (userProfile.role === "student") {
          navigate({ to: "/student" });
          return;
        }

        setProfile(userProfile);
      } catch (err) {
        console.error("Recruiter load error:", err);
        navigate({ to: "/login" });
      } finally {
        setLoading(false);
      }
    }

    loadRecruiter();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <p className="text-[14px] text-[#8a8a8a]">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between">
      {/* Top Floating Nav */}
      <header className="pt-8 px-4 flex justify-center w-full z-20">
        <nav
          aria-label="Recruiter navigation"
          className="flex h-12 w-full max-w-[640px] items-center justify-between rounded-full bg-[#141414] px-6 border border-[rgba(255,255,255,0.10)]"
        >
          <Link to="/" className="text-[16px] font-[650] tracking-tight text-[#f5f5f5]">
            HireSense
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </nav>
      </header>

      {/* Main Workspace Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[560px] rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-8 sm:p-12 text-center">
          {/* Avatar / Initials */}
          <div className="mx-auto mb-6 flex justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-20 w-20 rounded-full border-2 border-[#f5f5f5] object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-[22px] font-[600] text-[#f5f5f5]">
                {getInitials(profile.full_name)}
              </div>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-[36px] font-[650] leading-[1.05] tracking-tight text-[#f5f5f5]">
            Welcome, {profile.full_name}.
          </h1>

          <p className="mt-2 text-[16px] font-[450] text-[#8a8a8a]">
            @{profile.username} · {profile.email}
          </p>

          {/* Company & Role Badges */}
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.10)] px-3.5 py-1 text-[13px] font-[600] text-[#f5f5f5]">
              Recruiter
            </span>

            {profile.company_name && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.10)] bg-[#1a1a1a] px-3.5 py-1 text-[13px] font-[600] text-[#f5f5f5]">
                <Building size={13} className="text-[#8a8a8a]" />
                <span>{profile.company_name}</span>
              </span>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.10)] flex flex-col items-center gap-4">
            <p className="text-[14px] text-[#8a8a8a] max-w-sm">
              Your recruitment workspace is configured. Candidate evaluations, job posting tools,
              and interview reports will appear here.
            </p>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#f5f5f5] px-6 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98]"
            >
              Log out
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 pt-4 px-4 text-center">
        <p className="text-[12px] font-[450] text-[#8a8a8a]">HireSense · Recruiter Workspace</p>
      </footer>
    </div>
  );
}
