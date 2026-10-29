import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  LogOut,
  Building,
  UserCheck,
  Briefcase,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Inbox,
  Filter,
} from "lucide-react";
import { supabase, fetchUserProfile } from "@/lib/supabase";
import type { Profile, Job } from "@/types/database.types";
import { JobCard } from "@/components/JobCard";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { AddJobModal } from "@/components/AddJobModal";
import { EditJobModal } from "@/components/EditJobModal";

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

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [recruiterTab, setRecruiterTab] = useState<"all" | "published" | "draft">("all");
  const [studentWorkModeFilter, setStudentWorkModeFilter] = useState<string>("all");

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

        // Student avatar onboarding guard
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

  // Load jobs based on role
  const loadJobs = async () => {
    if (!profile) return;
    setJobsLoading(true);

    try {
      if (profile.role === "recruiter") {
        // Recruiters see all their own listings (draft & published)
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("recruiter_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setJobs((data as Job[]) || []);
        if (data && data.length > 0 && !selectedJobId) {
          setSelectedJobId(data[0].id);
        }
      } else {
        // Students see published jobs ONLY (never drafts)
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setJobs((data as Job[]) || []);
        if (data && data.length > 0 && !selectedJobId) {
          setSelectedJobId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading jobs:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadJobs();
    }
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  // Recruiter: Toggle job publication status (draft <-> published)
  const handleToggleJobStatus = async (job: Job) => {
    const nextStatus = job.status === "draft" ? "published" : "draft";
    try {
      const { data, error } = await supabase
        .from("jobs")
        .update({ status: nextStatus })
        .eq("id", job.id)
        .select()
        .single();

      if (error) throw error;
      setJobs((prev) => prev.map((j) => (j.id === job.id ? (data as Job) : j)));
    } catch (err) {
      console.error("Status toggle error:", err);
    }
  };

  // Recruiter: Delete job
  const handleDeleteJob = async (job: Job) => {
    if (!window.confirm(`Are you sure you want to delete "${job.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("jobs").delete().eq("id", job.id);
      if (error) throw error;

      setJobs((prev) => {
        const next = prev.filter((j) => j.id !== job.id);
        if (selectedJobId === job.id) {
          setSelectedJobId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    } catch (err) {
      console.error("Delete job error:", err);
    }
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search matching title, company, or location
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = job.title.toLowerCase().includes(q);
      const companyMatch = job.company_name.toLowerCase().includes(q);
      const locationMatch = (job.location || "").toLowerCase().includes(q);

      const matchesSearch = !q || titleMatch || companyMatch || locationMatch;
      if (!matchesSearch) return false;

      // Recruiter tab filter
      if (profile?.role === "recruiter") {
        if (recruiterTab === "published" && job.status !== "published") return false;
        if (recruiterTab === "draft" && job.status !== "draft") return false;
      }

      // Student work mode filter
      if (profile?.role === "student" && studentWorkModeFilter !== "all") {
        if ((job.work_mode || "").toLowerCase() !== studentWorkModeFilter) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, searchQuery, recruiterTab, studentWorkModeFilter, profile]);

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return filteredJobs[0] || null;
    return filteredJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || null;
  }, [selectedJobId, filteredJobs]);

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
  const isStudent = profile.role === "student";

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
      {/* Background Dot Grid */}
      <div aria-hidden className="dot-grid fixed inset-0 pointer-events-none opacity-40 z-0" />

      {/* Top Floating Pill Navigation */}
      <header className="sticky top-0 pt-6 pb-4 px-4 flex justify-center w-full z-40 bg-[#0a0a0a]/80 backdrop-blur-md">
        <nav
          aria-label="Dashboard navigation"
          className="flex h-12 w-full max-w-[1240px] items-center justify-between rounded-full bg-[#141414] px-6 border border-[rgba(255,255,255,0.10)]"
        >
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[16px] font-[650] tracking-tight text-[#f5f5f5] transition-opacity hover:opacity-80"
            >
              HireSense
            </Link>
            <span className="inline-block text-[11px] font-[600] px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.06)]">
              {isRecruiter ? "Recruiter" : "Student"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] text-[11px] font-[600] text-[#f5f5f5]">
                {getInitials(profile.full_name)}
              </div>
              <span className="hidden sm:inline text-[13px] font-[600] text-[#f5f5f5]">
                {profile.full_name}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-[13px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Workspace */}
      <main className="relative z-10 flex-1 max-w-[1240px] w-full mx-auto px-4 py-6 space-y-6">
        {/* Workspace Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-[650] tracking-tight text-[#f5f5f5] leading-tight">
              {isRecruiter ? "Recruiter Workspace." : "Jobs for you."}
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] font-[450] text-[#8a8a8a]">
              {isRecruiter
                ? "Structure job listings with AI, define requirement rubrics, and manage role pipelines."
                : "Explore verified role openings with explicit requirement matrices and direct application."}
            </p>
          </div>

          {/* Primary Action Button */}
          {isRecruiter && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5f5f5] px-6 text-[14px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98] shrink-0"
            >
              <Plus size={16} />
              <span>Add listing</span>
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707070]"
            />
            <input
              type="text"
              placeholder={
                isRecruiter
                  ? "Search your job listings..."
                  : "Search roles, companies, or locations..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[13px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
            />
          </div>

          {/* Role-Specific Filter Pills */}
          {isRecruiter ? (
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRecruiterTab("all")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  recruiterTab === "all"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                All ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setRecruiterTab("published")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  recruiterTab === "published"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                Published ({jobs.filter((j) => j.status === "published").length})
              </button>
              <button
                type="button"
                onClick={() => setRecruiterTab("draft")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  recruiterTab === "draft"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                Drafts ({jobs.filter((j) => j.status === "draft").length})
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStudentWorkModeFilter("all")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  studentWorkModeFilter === "all"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                All modes
              </button>
              <button
                type="button"
                onClick={() => setStudentWorkModeFilter("remote")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  studentWorkModeFilter === "remote"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                Remote
              </button>
              <button
                type="button"
                onClick={() => setStudentWorkModeFilter("hybrid")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  studentWorkModeFilter === "hybrid"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => setStudentWorkModeFilter("onsite")}
                className={`h-9 px-4 rounded-full text-[12px] font-[600] transition-colors ${
                  studentWorkModeFilter === "onsite"
                    ? "bg-[#f5f5f5] text-[#0a0a0a]"
                    : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                }`}
              >
                Onsite
              </button>
            </div>
          )}
        </div>

        {/* Master-Detail Layout (Desktop: List on Left, Detail Panel on Right) */}
        {jobsLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.2)] border-t-[#f5f5f5]" />
            <p className="mt-3 text-[14px] text-[#8a8a8a]">Loading job listings...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-12 text-center space-y-4 max-w-lg mx-auto my-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[30%] bg-[#1a1a1a] text-[#8a8a8a]">
              <Inbox size={24} />
            </div>
            <div>
              <h3 className="text-[18px] font-[650] text-[#f5f5f5]">
                {isRecruiter ? "No job listings yet." : "No published jobs found."}
              </h3>
              <p className="mt-1 text-[13px] text-[#8a8a8a] leading-relaxed">
                {isRecruiter
                  ? "Click 'Add listing' to structure your first job description from raw text."
                  : "Check back soon as recruiters publish verified positions to the feed."}
              </p>
            </div>
            {isRecruiter && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f5f5f5] px-6 text-[13px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0]"
              >
                <Plus size={15} />
                <span>Add first listing</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Job Cards List View */}
            <div className="lg:col-span-5 space-y-3.5 max-h-[82vh] overflow-y-auto pr-1">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onSelect={(j) => setSelectedJobId(j.id)}
                  isRecruiter={isRecruiter}
                  onEdit={(j) => setEditingJob(j)}
                  onToggleStatus={(j) => handleToggleJobStatus(j)}
                />
              ))}
            </div>

            {/* Right Column: Selected Job Detail Panel */}
            <div className="hidden lg:block lg:col-span-7 sticky top-24 max-h-[82vh] overflow-y-auto">
              {selectedJob ? (
                <JobDetailPanel
                  job={selectedJob}
                  isRecruiter={isRecruiter}
                  onEdit={(j) => setEditingJob(j)}
                  onToggleStatus={(j) => handleToggleJobStatus(j)}
                  onDelete={(j) => handleDeleteJob(j)}
                />
              ) : (
                <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-12 text-center text-[#8a8a8a]">
                  Select a job on the left to view details.
                </div>
              )}
            </div>

            {/* Mobile View: Modal / Sliding Panel for Selected Job */}
            {selectedJob && (
              <div className="block lg:hidden mt-6">
                <JobDetailPanel
                  job={selectedJob}
                  isRecruiter={isRecruiter}
                  onEdit={(j) => setEditingJob(j)}
                  onToggleStatus={(j) => handleToggleJobStatus(j)}
                  onDelete={(j) => handleDeleteJob(j)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-8 px-4 text-center border-t border-[rgba(255,255,255,0.06)] mt-12">
        <p className="text-[12px] font-[450] text-[#707070]">
          <span>© 2026 HireSense Inc.</span>
          <span className="mx-2">·</span>
          <span>{isRecruiter ? "Recruiter Workspace" : "Candidate Feed"}</span>
          <span className="mx-2">·</span>
          <span>People make every decision.</span>
        </p>
      </footer>

      {/* Recruiter "Add listing" Modal */}
      {isAddModalOpen && (
        <AddJobModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          recruiterId={profile.id}
          defaultCompany={profile.company_name || ""}
          onSuccess={(newJob) => {
            setJobs((prev) => [newJob, ...prev]);
            setSelectedJobId(newJob.id);
          }}
        />
      )}

      {/* Recruiter "Edit listing" Modal */}
      {editingJob && (
        <EditJobModal
          job={editingJob}
          isOpen={Boolean(editingJob)}
          onClose={() => setEditingJob(null)}
          onSuccess={(updatedJob) => {
            setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
            if (selectedJobId === updatedJob.id) {
              setSelectedJobId(updatedJob.id);
            }
          }}
        />
      )}
    </div>
  );
}
