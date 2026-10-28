import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X, Loader2, AlertCircle, Eye, EyeOff, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/hs/AuthLayout";
import { SmoothInput, FormField } from "@/components/ui/smooth-input";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";
import { ProgressIndicator, StepActions } from "@/components/ui/progress-indicator";
import { supabase, checkUsernameAvailability } from "@/lib/supabase";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — HireSense" },
      {
        name: "description",
        content: "Create your student account on HireSense.",
      },
    ],
  }),
  component: SignupPage,
});

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function SignupPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Guard: if already logged in, redirect to appropriate role page
  useEffect(() => {
    async function checkAlreadyLoggedIn() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { fetchUserProfile } = await import("@/lib/supabase");
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

  // Wizard state (steps 1 & 2 live on this route, step 3 is /signup/photo)
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordConfirmed, setIsPasswordConfirmed] = useState(false);

  // Validation States
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Submission / Flow States
  const [loading, setLoading] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  // Debounced username check
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus("idle");
      setUsernameMessage(null);
      return;
    }

    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(trimmed)) {
      setUsernameStatus("invalid");
      setUsernameMessage("3-20 characters: letters, numbers, dot or underscore only.");
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(trimmed);
        if (available) {
          setUsernameStatus("available");
          setUsernameMessage("Username is available.");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage("That username is taken.");
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameMessage(null);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username]);

  // Step 1 Validation
  const validateStep1 = () => {
    let valid = true;
    if (!fullName.trim()) {
      setFullNameError("Full name is required.");
      valid = false;
    } else {
      setFullNameError(null);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError(null);
    }

    return valid;
  };

  // Step 2 Password Validation
  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return "Must be at least 8 characters.";
    }
    if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return "Must contain at least one letter and one number.";
    }
    if (pwd.length > 64) {
      return "Maximum 64 characters.";
    }
    return null;
  };

  const handleStep1Continue = () => {
    if (validateStep1()) {
      setGlobalError(null);
      setStep(2);
    }
  };

  const handleStep2Submit = async () => {
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }
    setPasswordError(null);

    if (usernameStatus !== "available") {
      return;
    }

    if (!isPasswordConfirmed || password !== confirmPassword) {
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      // Never send role from client; server trigger defaults to 'student'
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setStep(1);
          setEmailError("An account with this email may already exist. Try logging in.");
          return;
        }
        if (error.message.includes("USERNAME_ALREADY_EXISTS")) {
          setUsernameStatus("taken");
          setUsernameMessage("That username is taken.");
          return;
        }
        setGlobalError(error.message || "Failed to create account. Please try again.");
        return;
      }

      // Check for obfuscated duplicate email (identities array empty)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setStep(1);
        setEmailError("An account with this email may already exist. Try logging in.");
        return;
      }

      if (data.session) {
        // Direct session returned -> Proceed to step 3 (photo upload)
        navigate({ to: "/signup/photo" });
      } else {
        // Email confirmation is required
        setNeedsEmailConfirm(true);
      }
    } catch (err: unknown) {
      console.error("Signup exception:", err);
      // Re-check username availability in case of collision
      const stillAvailable = await checkUsernameAvailability(username.trim());
      if (!stillAvailable) {
        setUsernameStatus("taken");
        setUsernameMessage("That username is taken.");
      } else {
        setGlobalError("A network error occurred. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid =
    fullName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    !fullNameError &&
    !emailError;

  const isStep2Valid =
    usernameStatus === "available" &&
    validatePassword(password) === null &&
    isPasswordConfirmed &&
    password === confirmPassword;

  if (needsEmailConfirm) {
    return (
      <AuthLayout navLink={{ to: "/login", label: "Log in" }}>
        <div className="w-full rounded-[24px] border border-[#f0f0f0] bg-white p-8 sm:p-10 text-center transition-all">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f0f0] text-[#141414]">
            <MailCheck size={28} />
          </div>

          <h1 className="text-[32px] font-[650] leading-[1.05] tracking-tight text-[#f5f5f5]">
            Check your email.
          </h1>
          <p className="mt-3 text-[16px] font-[300] leading-[1.45] text-[#8a8a8a]">
            We sent a confirmation link to{" "}
            <span className="font-medium text-[#f5f5f5]">{email}</span>. Click the link to activate
            your student account and complete your profile.
          </p>

          <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.10)]">
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#f5f5f5] px-8 text-[15px] font-[600] text-[#0a0a0a] transition-all hover:bg-[#e0e0e0]"
            >
              Return to log in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout navLink={{ to: "/login", label: "Log in" }}>
      <div className="w-full rounded-[24px] border border-[rgba(255,255,255,0.10)] bg-[#141414] p-8 sm:p-10 transition-all">
        {/* Progress Indicator */}
        <div className="mb-6">
          <ProgressIndicator step={step} totalSteps={3} />
        </div>

        {/* Wizard Header */}
        <div className="mb-8">
          <h1 className="text-[36px] font-[650] leading-[1.05] tracking-tight text-[#f5f5f5]">
            Create your account.
          </h1>
          <p className="mt-2 text-[18px] font-[300] leading-[1.38] text-[#8a8a8a]">
            {step === 1 ? "Step 1 of 3 · About you." : "Step 2 of 3 · Secure your account."}
          </p>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 flex items-center gap-2 rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] p-4 text-[14px] font-[450] text-[#f5f5f5]"
          >
            <AlertCircle size={18} className="shrink-0 text-[#f5f5f5]" />
            <span>{globalError}</span>
          </div>
        )}

        {/* Animated Wizard Steps */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <FormField
                label="Full name"
                htmlFor="signup-fullname"
                error={fullNameError || undefined}
                required
              >
                <SmoothInput
                  id="signup-fullname"
                  name="fullName"
                  autoComplete="name"
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fullNameError) setFullNameError(null);
                  }}
                  onBlur={() => {
                    if (!fullName.trim()) setFullNameError("Full name is required.");
                  }}
                  error={fullNameError || undefined}
                  required
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="signup-email"
                error={emailError || undefined}
                required
              >
                <SmoothInput
                  id="signup-email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. aarav@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  onBlur={() => {
                    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!email.trim() || !regex.test(email.trim())) {
                      setEmailError("Enter a valid email address.");
                    }
                  }}
                  error={emailError || undefined}
                  required
                />
              </FormField>

              <div className="pt-4">
                <StepActions
                  step={1}
                  totalSteps={3}
                  disabled={!isStep1Valid}
                  onContinue={handleStep1Continue}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Username Field with Availability Check */}
              <FormField label="Username" htmlFor="signup-username" required>
                <SmoothInput
                  id="signup-username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. aarav_m"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                  endAdornment={
                    usernameStatus === "checking" ? (
                      <Loader2 size={16} className="animate-spin text-[#8a8a8a]" />
                    ) : usernameStatus === "available" ? (
                      <Check size={16} className="text-[#f5f5f5]" />
                    ) : usernameStatus === "taken" || usernameStatus === "invalid" ? (
                      <X size={16} className="text-[#8a8a8a]" />
                    ) : null
                  }
                />
                {usernameMessage && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={`mt-1.5 flex items-center gap-1.5 text-[13px] ${
                      usernameStatus === "available"
                        ? "text-[#f5f5f5] font-medium"
                        : "text-[#8a8a8a] font-[450]"
                    }`}
                  >
                    <span>{usernameMessage}</span>
                  </p>
                )}
              </FormField>

              {/* Password Field */}
              <FormField
                label="Password"
                htmlFor="signup-password"
                error={passwordError || undefined}
                hint="At least 8 characters, with letters and numbers."
                required
              >
                <SmoothInput
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  onBlur={() => {
                    const err = validatePassword(password);
                    if (err) setPasswordError(err);
                  }}
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

              {/* Assisted Password Confirmation */}
              <FormField label="Confirm password" htmlFor="signup-confirm-password" required>
                <AssistedPasswordConfirmation
                  id="signup-confirm-password"
                  password={password}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  onMatchChange={setIsPasswordConfirmed}
                  disabled={loading}
                />
              </FormField>

              <div className="pt-4">
                <StepActions
                  step={2}
                  totalSteps={3}
                  disabled={!isStep2Valid || loading}
                  loading={loading}
                  onBack={() => setStep(1)}
                  onContinue={handleStep2Submit}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Notes & Student Login Link */}
        <div className="mt-8 space-y-4 pt-6 text-center border-t border-[rgba(255,255,255,0.10)]">
          <p className="text-[14px] text-[#8a8a8a]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-[600] text-[#f5f5f5] underline underline-offset-4 decoration-[#5c5c5c] hover:decoration-[#f5f5f5]"
            >
              Log in.
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
