import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { AuthLayout } from "@/components/hs/AuthLayout";
import { SmoothInput, FormField } from "@/components/ui/smooth-input";
import { supabase, fetchUserProfile } from "@/lib/supabase";
import { serverLoginFn } from "@/lib/auth-server";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — HireSense" },
      {
        name: "description",
        content: "Log in to your HireSense account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: if already logged in, redirect to appropriate role page
  useEffect(() => {
    async function checkAlreadyLoggedIn() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const profile = await fetchUserProfile(user.id);
          const role = user.app_metadata?.role || profile?.role || "student";
          if (role === "student") {
            if (!profile?.avatar_step_done) {
              navigate({ to: "/signup/photo" });
            } else {
              navigate({ to: "/student" });
            }
          } else {
            navigate({ to: "/recruiter" });
          }
        }
      } catch (e) {
        console.error("Session check error:", e);
      }
    }
    checkAlreadyLoggedIn();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      setError("Invalid credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let authUser: { id: string; app_metadata?: { role?: string } } | null = null;

      if (trimmedId.includes("@")) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: trimmedId,
          password,
        });

        if (authError || !data.user) {
          setError("Invalid credentials.");
          setLoading(false);
          return;
        }
        authUser = data.user;
      } else {
        // Resolve username server-side
        const res = await serverLoginFn({
          data: {
            identifier: trimmedId,
            password,
          },
        });

        if (!res.success || !res.session) {
          setError("Invalid credentials.");
          setLoading(false);
          return;
        }

        // Set session on the browser client
        const { data: sessionData, error: setSessionErr } = await supabase.auth.setSession(
          res.session as { access_token: string; refresh_token: string },
        );

        if (setSessionErr || !sessionData.user) {
          setError("Invalid credentials.");
          setLoading(false);
          return;
        }

        authUser = sessionData.user;
      }

      if (!authUser) {
        setError("Invalid credentials.");
        setLoading(false);
        return;
      }

      // Fetch profile to check role and avatar_step_done
      const profile = await fetchUserProfile(authUser.id);
      const role = authUser.app_metadata?.role || profile?.role || "student";
      const avatarDone = profile?.avatar_step_done ?? false;

      if (role === "student") {
        if (!avatarDone) {
          navigate({ to: "/signup/photo" });
        } else {
          navigate({ to: "/student" });
        }
      } else {
        navigate({ to: "/recruiter" });
      }
    } catch (err) {
      console.error("Login failure:", err);
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout navLink={{ to: "/signup", label: "Sign up" }}>
      <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-8 sm:p-10 transition-all">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[36px] font-[650] leading-[1.05] tracking-tight text-[#f5f5f5]">
            Welcome back.
          </h1>
          <p className="mt-2 text-[18px] font-[300] leading-[1.38] text-[#8a8a8a]">
            Log in with your email or username to continue.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 flex items-center gap-2 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] p-4 text-[14px] font-[450] text-[#f5f5f5]"
          >
            <AlertCircle size={18} className="shrink-0 text-[#f5f5f5]" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="Email or username" htmlFor="login-identifier">
            <SmoothInput
              id="login-identifier"
              name="identifier"
              autoComplete="username"
              placeholder="e.g. aarav or aarav@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              required
            />
          </FormField>

          <FormField label="Password" htmlFor="login-password">
            <SmoothInput
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="p-1 text-[#8a8a8a] transition-colors hover:text-[#f5f5f5] focus-visible:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </FormField>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#f5f5f5] px-6 text-[15px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#f5f5f5]"
            >
              {loading ? <Loader2 size={18} className="animate-spin text-[#0a0a0a]" /> : "Log in"}
            </button>
          </div>
        </form>

        {/* Footer Notes & Student Signup Link */}
        <div className="mt-8 space-y-4 pt-6 text-center border-t border-[rgba(255,255,255,0.10)]">
          <p className="text-[14px] text-[#8a8a8a]">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-[600] text-[#f5f5f5] underline underline-offset-4 decoration-[#5c5c5c] hover:decoration-[#f5f5f5]"
            >
              Create a student account.
            </Link>
          </p>

          <p className="text-[12px] text-[#8a8a8a] leading-relaxed">
            Recruiter accounts are issued by your administrator.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
