import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Calendar,
  Mail,
  Link2,
  Pencil,
  Check,
  User,
  Briefcase,
  AlertCircle,
  Copy,
  CheckCheck,
  Building2,
  ExternalLink,
  School,
} from "lucide-react";
import { supabase, fetchUserProfile, fetchProfileByUsername } from "@/lib/supabase";
import type { Profile } from "@/types/database.types";
import ProfileDropdown from "@/components/kokonutui/profile-dropdown";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { UniversityLogo } from "@/components/UniversityLogo";
import { CompanyLogo } from "@/components/CompanyLogo";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { searchUniversities } from "@/data/universities";
import { searchCompanies } from "@/data/companies";
import { GitHubIcon, LinkedInIcon, TwitterIcon, LeetCodeIcon } from "@/components/SocialIcons";

export const Route = createFileRoute("/student/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — Profile · HireSense` },
      {
        name: "description",
        content: `HireSense verified student profile for @${params.username}.`,
      },
    ],
  }),
  component: StudentProfilePage,
});

function normalizeSocialUrl(value: string, baseUrl: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const clean = trimmed.replace(/^@/, "");
  return `${baseUrl}${clean}`;
}

function cleanDisplayUrl(url: string | null): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function StudentProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();

  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [formFullName, setFormFullName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formCollege, setFormCollege] = useState("");
  const [formUniversity, setFormUniversity] = useState("");
  const [formDegree, setFormDegree] = useState("");
  const [formIsHired, setFormIsHired] = useState(false);
  const [formHiredCompany, setFormHiredCompany] = useState("");
  const [formTwitter, setFormTwitter] = useState("");
  const [formGithub, setFormGithub] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formLeetcode, setFormLeetcode] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setNotFound(false);
      try {
        // 1. Fetch current logged in user (if any)
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        let loggedInProfile: Profile | null = null;
        if (authUser) {
          loggedInProfile = await fetchUserProfile(authUser.id);
          if (isMounted) {
            setCurrentUser(loggedInProfile);
          }
        }

        // 2. Fetch the target student profile by username
        const studentProfile = await fetchProfileByUsername(username);

        if (!studentProfile) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (isMounted) {
          setTargetProfile(studentProfile);
          syncFormState(studentProfile);
        }
      } catch (err) {
        console.error("Error loading student profile:", err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [username]);

  const syncFormState = (p: Profile) => {
    setFormFullName(p.full_name || "");
    setFormAge(p.age !== null ? String(p.age) : "");
    setFormCollege(p.college || "");
    setFormUniversity(p.university || "");
    setFormDegree(p.degree || "");
    setFormIsHired(Boolean(p.is_hired));
    setFormHiredCompany(p.hired_company || "");
    setFormTwitter(p.twitter_url || "");
    setFormGithub(p.github_url || "");
    setFormLinkedin(p.linkedin_url || "");
    setFormLeetcode(p.leetcode_url || "");
    setSelectedFile(null);
    setFormError(null);
  };

  const isOwner = Boolean(
    currentUser && targetProfile && currentUser.id === targetProfile.id
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const handleStartEditing = () => {
    if (!targetProfile) return;
    syncFormState(targetProfile);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    if (!targetProfile) return;
    syncFormState(targetProfile);
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfile || !isOwner) return;

    const trimmedName = formFullName.trim();
    if (!trimmedName) {
      setFormError("Full name is required.");
      return;
    }

    let parsedAge: number | null = null;
    if (formAge.trim()) {
      const num = parseInt(formAge.trim(), 10);
      if (isNaN(num) || num < 14 || num > 120) {
        setFormError("Please enter a valid age between 14 and 120.");
        return;
      }
      parsedAge = num;
    }

    if (formIsHired && !formHiredCompany.trim()) {
      setFormError("Please enter the company name where you were hired.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      let finalAvatarUrl = targetProfile.avatar_url;

      // Upload new avatar if a file was selected via FileUpload
      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop() || "jpg";
        const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
        const fileName = `${Date.now()}.${cleanExt}`;
        const filePath = `${targetProfile.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("Avatar upload failed:", uploadError);
          setFormError("Could not upload new photo. Please try again.");
          setIsSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      }

      // Normalise social links
      const finalTwitter = normalizeSocialUrl(formTwitter, "https://x.com/");
      const finalGithub = normalizeSocialUrl(formGithub, "https://github.com/");
      const finalLinkedin = normalizeSocialUrl(formLinkedin, "https://linkedin.com/in/");
      const finalLeetcode = normalizeSocialUrl(formLeetcode, "https://leetcode.com/u/");

      // Update database profile
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          age: parsedAge,
          college: formCollege.trim() || null,
          university: formUniversity.trim() || null,
          degree: formDegree.trim() || null,
          is_hired: formIsHired,
          hired_company: formIsHired ? formHiredCompany.trim() : null,
          twitter_url: finalTwitter,
          github_url: finalGithub,
          linkedin_url: finalLinkedin,
          leetcode_url: finalLeetcode,
          avatar_url: finalAvatarUrl,
          avatar_step_done: true,
        })
        .eq("id", targetProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error("Profile update failed:", updateError);
        setFormError(updateError.message || "Failed to update profile.");
        setIsSaving(false);
        return;
      }

      const updated = data as Profile;
      setTargetProfile(updated);
      if (currentUser && currentUser.id === updated.id) {
        setCurrentUser(updated);
      }
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Profile save error:", err);
      setFormError("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.2)] border-t-[#f5f5f5]" />
          <p className="text-[14px] text-[#8a8a8a] font-[450]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound || !targetProfile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
        <div aria-hidden className="dot-grid fixed inset-0 pointer-events-none opacity-40 z-0" />
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="h-16 w-16 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.10)] flex items-center justify-center mb-4 text-[#8a8a8a]">
            <User size={28} />
          </div>
          <h1 className="text-[28px] font-[650] text-[#f5f5f5] tracking-tight">Student not found.</h1>
          <p className="mt-2 text-[14px] text-[#8a8a8a] leading-relaxed">
            No profile exists with the username <span className="text-[#f5f5f5]">@{username}</span> on HireSense.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#f5f5f5] px-6 text-[13px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0]"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const hasSocials = Boolean(
    targetProfile.github_url ||
    targetProfile.linkedin_url ||
    targetProfile.twitter_url ||
    targetProfile.leetcode_url
  );

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-between selection:bg-[#f5f5f5] selection:text-[#0a0a0a]">
      {/* Background Dot Grid */}
      <div aria-hidden className="dot-grid fixed inset-0 pointer-events-none opacity-40 z-0" />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-[880px] w-full mx-auto px-4 pt-6 sm:pt-8 pb-16 space-y-6">
        {/* Top Minimal Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-[14px] font-[600] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
          >
            <ArrowLeft size={16} />
            <span>Back to jobs</span>
          </Link>

          {currentUser && (
            <ProfileDropdown
              accounts={[
                {
                  id: currentUser.id,
                  name: currentUser.full_name,
                  email: currentUser.email,
                  avatar_url: currentUser.avatar_url,
                  plan: currentUser.role === "recruiter" ? "Recruiter" : "Student",
                },
              ]}
              defaultAccountId={currentUser.id}
              items={[
                {
                  label: "Profile",
                  icon: <User className="size-4" />,
                  href: `/student/${currentUser.username}`,
                },
                {
                  label: "Dashboard",
                  icon: <Briefcase className="size-4" />,
                  href: "/dashboard",
                },
              ]}
              onSignOut={handleLogout}
            />
          )}
        </div>

        {/* Profile Hero Card */}
        <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8">
          {!isEditing ? (
            /* VIEW MODE */
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Profile Picture */}
                <div className="relative shrink-0">
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden bg-[#1a1a1a] border-2 border-[rgba(255,255,255,0.14)] flex items-center justify-center text-[#f5f5f5]">
                    {targetProfile.avatar_url ? (
                      <img
                        src={targetProfile.avatar_url}
                        alt={targetProfile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[28px] font-[650] tracking-wider text-[#f5f5f5]">
                        {getInitials(targetProfile.full_name)}
                      </span>
                    )}
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-3 ring-[#141414]"
                    title="Active candidate"
                  />
                </div>

                {/* Name, Handle, Badges */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-[26px] sm:text-[32px] font-[650] tracking-tight text-[#f5f5f5] leading-tight">
                      {targetProfile.full_name}.
                    </h1>

                    {/* Hired Status Badge */}
                    {targetProfile.is_hired && targetProfile.hired_company ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[12px] font-[600]">
                        <CompanyLogo name={targetProfile.hired_company} size="xs" />
                        <span>Hired at {targetProfile.hired_company}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[rgba(0,102,255,0.10)] text-[#0066ff] border border-[rgba(0,102,255,0.20)] text-[11px] font-[600]">
                        <span className="size-1.5 rounded-full bg-[#0066ff]" />
                        <span>Open to roles</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[14px] font-[600] text-[#8a8a8a]">
                    @{targetProfile.username}
                  </p>

                  <p className="text-[13px] font-[450] text-[#707070]">
                    {targetProfile.is_hired && targetProfile.hired_company
                      ? `Placed candidate · Currently at ${targetProfile.hired_company}`
                      : "Verified candidate profile on HireSense"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1a1a1a] px-4 text-[13px] font-[600] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] transition-colors hover:text-[#f5f5f5]"
                  title="Copy profile link"
                >
                  {copiedLink ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedLink ? "Copied" : "Share"}</span>
                </button>

                {isOwner && (
                  <button
                    id="edit-profile-btn"
                    type="button"
                    onClick={handleStartEditing}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f5f5f5] px-5 text-[13px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.98]"
                  >
                    <Pencil size={14} />
                    <span>Edit profile</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
                <div>
                  <h2 className="text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
                    Edit profile.
                  </h2>
                  <p className="text-[13px] text-[#8a8a8a]">
                    Update your candidate identity, education, employment status, and developer links.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="rounded-[16px] bg-red-950/40 border border-red-500/30 p-3.5 flex items-start gap-2.5 text-[13px] text-red-200">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Exact Same Profile Image Picker as used in Signup */}
              <div className="space-y-2">
                <label className="block text-[12px] font-[600] text-[#8a8a8a]">
                  Profile photo
                </label>
                <AvatarUpload
                  value={selectedFile}
                  onFileSelect={setSelectedFile}
                  acceptedFileTypes={["image/jpeg", "image/png", "image/webp"]}
                  maxFileSize={5 * 1024 * 1024}
                  circularPreview={true}
                  disabled={isSaving}
                  error={formError || undefined}
                />
              </div>

              {/* Basic Information */}
              <div className="space-y-4 pt-2">
                <h3 className="text-[14px] font-[650] text-[#f5f5f5] uppercase tracking-wider text-[11px] text-[#707070]">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="formFullName" className="block text-[12px] font-[600] text-[#8a8a8a]">
                      Full name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="formFullName"
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. Varnit Agustya"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-1.5">
                    <label htmlFor="formAge" className="block text-[12px] font-[600] text-[#8a8a8a]">
                      Age
                    </label>
                    <input
                      id="formAge"
                      type="number"
                      min="14"
                      max="120"
                      value={formAge}
                      onChange={(e) => setFormAge(e.target.value)}
                      placeholder="e.g. 21"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>
                </div>
              </div>

              {/* Education (College & University) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-[14px] font-[650] text-[#f5f5f5] uppercase tracking-wider text-[11px] text-[#707070]">
                  Education & Institution
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* University */}
                  <div className="space-y-1.5 sm:col-span-1">
                    <label htmlFor="formUniversity" className="block text-[12px] font-[600] text-[#8a8a8a]">
                      University
                    </label>
                    <AutocompleteInput
                      id="formUniversity"
                      value={formUniversity}
                      onChange={(val) => setFormUniversity(val)}
                      onSelect={(item) => setFormUniversity(item.name)}
                      suggestions={searchUniversities(formUniversity, 8).map((u) => ({
                        id: u.id,
                        name: u.name,
                        subtitle: u.state || u.country,
                        logo: u.logo,
                        domain: u.domain,
                      }))}
                      placeholder="e.g. Bennett University, IIT Bombay"
                    />
                  </div>

                  {/* College */}
                  <div className="space-y-1.5 sm:col-span-1">
                    <label htmlFor="formCollege" className="block text-[12px] font-[600] text-[#8a8a8a]">
                      College / Campus
                    </label>
                    <input
                      id="formCollege"
                      type="text"
                      value={formCollege}
                      onChange={(e) => setFormCollege(e.target.value)}
                      placeholder="e.g. School of Engineering"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>

                  {/* Degree */}
                  <div className="space-y-1.5 sm:col-span-1">
                    <label htmlFor="formDegree" className="block text-[12px] font-[600] text-[#8a8a8a]">
                      Degree / Major
                    </label>
                    <input
                      id="formDegree"
                      type="text"
                      value={formDegree}
                      onChange={(e) => setFormDegree(e.target.value)}
                      placeholder="e.g. B.Tech Computer Science"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Status (If hired, display company) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-[14px] font-[650] text-[#f5f5f5] uppercase tracking-wider text-[11px] text-[#707070]">
                  Employment Status
                </h3>
                <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      id="formIsHired"
                      type="checkbox"
                      checked={formIsHired}
                      onChange={(e) => setFormIsHired(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#f5f5f5] bg-[#141414] border border-[rgba(255,255,255,0.20)]"
                    />
                    <div>
                      <span className="text-[14px] font-[600] text-[#f5f5f5]">
                        I have been hired / currently employed
                      </span>
                      <p className="text-[12px] text-[#8a8a8a]">
                        Display the company where you are working on your public profile.
                      </p>
                    </div>
                  </label>

                  {formIsHired && (
                    <div className="space-y-1.5 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                      <label htmlFor="formHiredCompany" className="block text-[12px] font-[600] text-[#8a8a8a]">
                        Company name <span className="text-red-400">*</span>
                      </label>
                      <AutocompleteInput
                        id="formHiredCompany"
                        value={formHiredCompany}
                        onChange={(val) => setFormHiredCompany(val)}
                        onSelect={(item) => setFormHiredCompany(item.name)}
                        suggestions={searchCompanies(formHiredCompany, 8).map((c) => ({
                          id: c.id,
                          name: c.name,
                          subtitle: `${c.domain}${c.category ? ` · ${c.category}` : ""}`,
                          logo: c.logo,
                          domain: c.domain,
                        }))}
                        placeholder="e.g. Google, Microsoft, Zomato, Swiggy, TCS"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Developer & Social Profiles (Twitter, GitHub, LinkedIn, LeetCode) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-[14px] font-[650] text-[#f5f5f5] uppercase tracking-wider text-[11px] text-[#707070]">
                  Social & Developer Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* GitHub */}
                  <div className="space-y-1.5">
                    <label htmlFor="formGithub" className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                      <GitHubIcon className="size-3.5 text-[#f5f5f5]" />
                      <span>GitHub (username or URL)</span>
                    </label>
                    <input
                      id="formGithub"
                      type="text"
                      value={formGithub}
                      onChange={(e) => setFormGithub(e.target.value)}
                      placeholder="e.g. github.com/username or @username"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-1.5">
                    <label htmlFor="formLinkedin" className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                      <LinkedInIcon className="size-3.5 text-[#0077b5]" />
                      <span>LinkedIn (profile URL or handle)</span>
                    </label>
                    <input
                      id="formLinkedin"
                      type="text"
                      value={formLinkedin}
                      onChange={(e) => setFormLinkedin(e.target.value)}
                      placeholder="e.g. linkedin.com/in/username"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>

                  {/* Twitter / X */}
                  <div className="space-y-1.5">
                    <label htmlFor="formTwitter" className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                      <TwitterIcon className="size-3.5 text-[#f5f5f5]" />
                      <span>Twitter / X (handle or URL)</span>
                    </label>
                    <input
                      id="formTwitter"
                      type="text"
                      value={formTwitter}
                      onChange={(e) => setFormTwitter(e.target.value)}
                      placeholder="e.g. @username or x.com/username"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>

                  {/* LeetCode */}
                  <div className="space-y-1.5">
                    <label htmlFor="formLeetcode" className="flex items-center gap-2 text-[12px] font-[600] text-[#8a8a8a]">
                      <LeetCodeIcon className="size-3.5 text-[#ffa116]" />
                      <span>LeetCode (handle or URL)</span>
                    </label>
                    <input
                      id="formLeetcode"
                      type="text"
                      value={formLeetcode}
                      onChange={(e) => setFormLeetcode(e.target.value)}
                      placeholder="e.g. leetcode.com/u/username or @username"
                      className="w-full h-11 px-4 rounded-[16px] bg-[#1a1a1a] border-0 text-[14px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#1a1a1a] px-5 text-[13px] font-[600] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] transition-colors hover:text-[#f5f5f5] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="save-profile-btn"
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#f5f5f5] px-6 text-[13px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.2)] border-t-[#0a0a0a]" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Socials & Developer Links (View Mode) */}
        {!isEditing && (
          <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h2 className="text-[18px] font-[650] text-[#f5f5f5] tracking-tight">
                Social & Developer profiles.
              </h2>
              {isOwner && !hasSocials && (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="text-[12px] font-[600] text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
                >
                  + Add links
                </button>
              )}
            </div>

            {hasSocials ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {targetProfile.github_url && (
                  <a
                    href={targetProfile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.18)] transition-all group"
                  >
                    <div className="h-9 w-9 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5f5f5] shrink-0 group-hover:scale-105 transition-transform">
                      <GitHubIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-[600] text-[#8a8a8a] uppercase tracking-wider">GitHub</p>
                      <p className="text-[13px] font-[600] text-[#f5f5f5] truncate">
                        {cleanDisplayUrl(targetProfile.github_url).replace("github.com/", "")}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-[#5c5c5c] group-hover:text-[#f5f5f5] shrink-0" />
                  </a>
                )}

                {targetProfile.linkedin_url && (
                  <a
                    href={targetProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.18)] transition-all group"
                  >
                    <div className="h-9 w-9 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#0077b5] shrink-0 group-hover:scale-105 transition-transform">
                      <LinkedInIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-[600] text-[#8a8a8a] uppercase tracking-wider">LinkedIn</p>
                      <p className="text-[13px] font-[600] text-[#f5f5f5] truncate">
                        {cleanDisplayUrl(targetProfile.linkedin_url).replace("linkedin.com/in/", "")}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-[#5c5c5c] group-hover:text-[#f5f5f5] shrink-0" />
                  </a>
                )}

                {targetProfile.twitter_url && (
                  <a
                    href={targetProfile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.18)] transition-all group"
                  >
                    <div className="h-9 w-9 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#f5f5f5] shrink-0 group-hover:scale-105 transition-transform">
                      <TwitterIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-[600] text-[#8a8a8a] uppercase tracking-wider">X / Twitter</p>
                      <p className="text-[13px] font-[600] text-[#f5f5f5] truncate">
                        @{cleanDisplayUrl(targetProfile.twitter_url).replace("x.com/", "").replace("twitter.com/", "")}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-[#5c5c5c] group-hover:text-[#f5f5f5] shrink-0" />
                  </a>
                )}

                {targetProfile.leetcode_url && (
                  <a
                    href={targetProfile.leetcode_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.18)] transition-all group"
                  >
                    <div className="h-9 w-9 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#ffa116] shrink-0 group-hover:scale-105 transition-transform">
                      <LeetCodeIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-[600] text-[#8a8a8a] uppercase tracking-wider">LeetCode</p>
                      <p className="text-[13px] font-[600] text-[#f5f5f5] truncate">
                        {cleanDisplayUrl(targetProfile.leetcode_url).replace("leetcode.com/u/", "").replace("leetcode.com/", "")}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-[#5c5c5c] group-hover:text-[#f5f5f5] shrink-0" />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-[13px] font-[450] text-[#707070] italic">
                No social or developer profiles linked yet.
              </p>
            )}
          </div>
        )}

        {/* Academic Credentials Card (LinkedIn style with University Logo) */}
        {!isEditing && (
          <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 space-y-6">
            <div className="border-b border-[rgba(255,255,255,0.08)] pb-4">
              <h2 className="text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
                Academic credentials.
              </h2>
              <p className="mt-0.5 text-[13px] text-[#8a8a8a]">
                Verified education records used in role requirement matching rubrics.
              </p>
            </div>

            {targetProfile.university || targetProfile.college || targetProfile.degree ? (
              <div className="rounded-[20px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                {/* LinkedIn-style University Logo */}
                <UniversityLogo
                  name={targetProfile.university || targetProfile.college || "University"}
                  size="lg"
                  className="rounded-[12px]"
                />

                <div className="space-y-1.5 flex-1 min-w-0">
                  <h3 className="text-[18px] sm:text-[20px] font-[650] text-[#f5f5f5] tracking-tight leading-snug">
                    {targetProfile.university || "University"}
                  </h3>

                  {targetProfile.degree && (
                    <p className="text-[15px] font-[500] text-[#f5f5f5]">
                      {targetProfile.degree}
                    </p>
                  )}

                  {targetProfile.college && (
                    <p className="text-[13px] font-[450] text-[#8a8a8a] flex items-center gap-1.5">
                      <School size={14} className="text-[#707070]" />
                      <span>{targetProfile.college}</span>
                    </p>
                  )}

                  <p className="text-[12px] font-[450] text-[#707070] pt-1">
                    Verified student candidate on HireSense
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] bg-[#1a1a1a] p-6 text-center text-[#707070] text-[14px]">
                No university or degree records added yet.
              </div>
            )}
          </div>
        )}

        {/* Hired Company / Career Status Card */}
        {!isEditing && targetProfile.is_hired && targetProfile.hired_company && (
          <div className="rounded-[24px] bg-[#141414] border border-emerald-500/20 p-6 sm:p-8 space-y-4">
            <div className="border-b border-[rgba(255,255,255,0.08)] pb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-[650] text-[#f5f5f5] tracking-tight">
                Current Employment.
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-[600]">
                Active Placement
              </span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)]">
              <CompanyLogo name={targetProfile.hired_company} size="lg" />
              <div>
                <p className="text-[17px] font-[650] text-[#f5f5f5] tracking-tight">
                  {targetProfile.hired_company}
                </p>
                <p className="text-[13px] text-[#8a8a8a]">
                  Candidate hired and placed through verified role matching.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Personal & Account Details Card */}
        {!isEditing && (
          <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 space-y-6">
            <div className="border-b border-[rgba(255,255,255,0.08)] pb-4">
              <h2 className="text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
                Personal details.
              </h2>
              <p className="mt-0.5 text-[13px] text-[#8a8a8a]">
                Observable candidate attributes and contact channels.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Age */}
              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#8a8a8a] shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[12px] font-[600] text-[#8a8a8a]">Age</p>
                  <p className="text-[14px] font-[600] text-[#f5f5f5]">
                    {targetProfile.age !== null ? `${targetProfile.age} years old` : "Not provided"}
                  </p>
                </div>
              </div>

              {/* Email Address */}
              <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#8a8a8a] shrink-0">
                  <Mail size={18} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[12px] font-[600] text-[#8a8a8a]">Contact email</p>
                  <p className="text-[14px] font-[600] text-[#f5f5f5] truncate">
                    {targetProfile.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile URL strip */}
            <div className="rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#8a8a8a] shrink-0">
                  <Link2 size={15} />
                </div>
                <div>
                  <p className="text-[12px] font-[600] text-[#8a8a8a]">Public profile URL</p>
                  <p className="text-[13px] font-[450] text-[#f5f5f5] font-mono">
                    hiresense.online/student/{targetProfile.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#141414] px-3.5 text-[12px] font-[600] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] transition-colors hover:text-[#f5f5f5] self-start sm:self-auto"
              >
                {copiedLink ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedLink ? "Link copied" : "Copy link"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Responsible AI Platform Statement */}
        <div className="rounded-[20px] bg-[#141414]/50 border border-[rgba(255,255,255,0.06)] p-5 text-left space-y-1.5">
          <p className="text-[13px] font-[600] text-[#f5f5f5]">Auditable evidence basis.</p>
          <p className="text-[12px] font-[450] text-[#8a8a8a] leading-relaxed">
            Candidate academic records and resume spans are evaluated strictly against verified role criteria.
            Proctoring events are observable telemetry signals, never psychological judgments. People make every decision.
          </p>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 pb-8 pt-8 px-4 text-center border-t border-[rgba(255,255,255,0.06)] mt-8">
        <p className="text-[12px] font-[450] text-[#707070]">
          <span>© 2026 HireSense Inc.</span>
          <span className="mx-2">·</span>
          <span>Verified Student Profile</span>
          <span className="mx-2">·</span>
          <span>People make every decision.</span>
        </p>
      </footer>
    </div>
  );
}
