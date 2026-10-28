import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LogOut, Building, UserCheck, Shield, Sparkles, FileText, Briefcase } from "lucide-react";
import { supabase, fetchUserProfile } from "@/lib/supabase";
import type { Profile } from "@/types/database.types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HireSense" },
      {
        name: "description",
        content: "HireSense AI recruitment & candidate workspace.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessionAndProfile() {
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

        // If student has not completed avatar step, prompt them to finish it
        if (userProfile.role === "student" && !userProfile.avatar_step_done) {
          navigate({ to: "/signup/photo" });
          return;
        }

        setProfile(userProfile);
      } catch (err) {
        console.error("Dashboard profile load error:", err);
        navigate({ to: "/login" });
      } finally {
        setLoading(false);
      }
    }

    loadSessionAndProfile();
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.2)] border-t-[#f5f5f5]" />
          <p className="text-[14px] text-[#8a8a8a] font-[450]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const isRecruiter = profile.role === "recruiter";
  const isAdmin = profile.role === "admin";
  const isStudent = profile.role === "student";

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between overflow-hidden selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
      {/* Background Dot Grid */}
      <div aria-hidden className="dot-grid absolute inset-0 pointer-events-none opacity-60" />

      {/* Top Floating Pill Navigation */}
      <header className="relative pt-8 px-4 flex justify-center w-full z-20">
        <nav
          aria-label="Dashboard navigation"
          className="flex h-12 w-full max-w-[680px] items-center justify-between rounded-full bg-[#141414] px-6 border border-[rgba(255,255,255,0.10)]"
        >
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[16px] font-[650] tracking-tight text-[#f5f5f5] transition-opacity hover:opacity-80"
            >
              HireSense
            </Link>
            <span className="hidden sm:inline-block text-[12px] font-[600] px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)]">
              {isRecruiter ? "Recruiter" : isAdmin ? "Admin" : "Student"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Workspace View */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[580px] rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-8 sm:p-12 text-center shadow-2xl">
          {/* Avatar / Photo / Initials */}
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

          {/* Heading with Terminal Period */}
          <h1 className="text-[34px] sm:text-[38px] font-[650] leading-[1.05] tracking-tight text-[#f5f5f5]">
            Welcome, {profile.full_name}.
          </h1>

          {/* Subtitle with username & email */}
          <p className="mt-2 text-[15px] sm:text-[16px] font-[450] text-[#8a8a8a]">
            @{profile.username} · {profile.email}
          </p>

          {/* Badges */}
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.10)] px-3.5 py-1 text-[13px] font-[600] text-[#f5f5f5]">
              {isRecruiter && <Briefcase size={13} className="text-[#8a8a8a]" />}
              {isStudent && <UserCheck size={13} className="text-[#8a8a8a]" />}
              {isAdmin && <Shield size={13} className="text-[#8a8a8a]" />}
              <span>{isRecruiter ? "Recruiter" : isAdmin ? "Administrator" : "Student"}</span>
            </span>

            {isRecruiter && profile.company_name && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.10)] bg-[#1a1a1a] px-3.5 py-1 text-[13px] font-[600] text-[#f5f5f5]">
                <Building size={13} className="text-[#8a8a8a]" />
                <span>{profile.company_name}</span>
              </span>
            )}
          </div>

          {/* Role-Specific Workspace Preview */}
          <div className="mt-8 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-[#f5f5f5] text-[14px] font-[600]">
              {isRecruiter ? (
                <>
                  <Briefcase size={16} className="text-[#8a8a8a]" />
                  <span>Recruitment Workspace</span>
                </>
              ) : (
                <>
                  <FileText size={16} className="text-[#8a8a8a]" />
                  <span>Candidate Workspace</span>
                </>
              )}
            </div>

            <p className="text-[13px] text-[#8a8a8a] leading-relaxed">
              {isRecruiter
                ? "Your organization workspace is active. Role definitions, applicant match pipelines, and multilingual AI interview evaluations will appear here."
                : "Your applicant profile is ready. Resume uploads, role compatibility scores, and scheduled AI interview reports will appear here."}
            </p>

            <div className="pt-2 flex items-center gap-2 text-[12px] text-[#5c5c5c]">
              <Sparkles size={13} />
              <span>Human in the loop · Every score links to verified evidence</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.10)] px-6 text-[14px] font-[600] text-[#f5f5f5] transition-all hover:bg-[#262626]"
            >
              Explore platform
            </Link>
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
      <footer className="relative z-10 pb-8 pt-4 px-4 text-center">
        <p className="text-[12px] font-[450] text-[#8a8a8a]">
          <span>© 2026 HireSense Inc.</span>
          <span className="mx-2">·</span>
          <span>
            {isRecruiter
              ? "Recruiter Workspace"
              : isStudent
                ? "Student Workspace"
                : "Admin Workspace"}
          </span>
        </p>
      </footer>
    </div>
  );
}

export default DashboardPage;
