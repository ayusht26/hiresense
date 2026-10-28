import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { EASE } from "./motion";

export type AuthTab = "login" | "signup";

interface AuthCardProps {
  defaultTab?: AuthTab;
  onTabChange?: (tab: AuthTab) => void;
}

export function AuthCard({ defaultTab = "signup", onTabChange }: AuthCardProps) {
  const [tab, setTab] = useState<AuthTab>(defaultTab);

  // Form field states (purely UI state for design)
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleTabSwitch = (newTab: AuthTab) => {
    setTab(newTab);
    onTabChange?.(newTab);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pure design - no backend logic implemented as requested
  };

  return (
    <div className="w-full max-w-[430px]">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#141414] p-7 shadow-2xl shadow-black/80 sm:p-8"
      >
        {/* Top Segmented Control (Pill toggle) */}
        <div className="relative mb-7 flex rounded-full bg-[#191919] p-1 border border-white/[0.05]">
          <button
            type="button"
            onClick={() => handleTabSwitch("login")}
            className={`relative z-10 flex-1 py-2 text-[14px] font-semibold transition-colors duration-200 ${
              tab === "login" ? "text-[#f5f5f5]" : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            {tab === "login" && (
              <motion.div
                layoutId="auth-tab-pill"
                className="absolute inset-0 rounded-full bg-[#262626] border border-white/[0.08]"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">Log in</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("signup")}
            className={`relative z-10 flex-1 py-2 text-[14px] font-semibold transition-colors duration-200 ${
              tab === "signup" ? "text-[#f5f5f5]" : "text-[#8a8a8a] hover:text-[#f5f5f5]"
            }`}
          >
            {tab === "signup" && (
              <motion.div
                layoutId="auth-tab-pill"
                className="absolute inset-0 rounded-full bg-[#262626] border border-white/[0.08]"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">Sign up</span>
          </button>
        </div>

        {/* Form Body with Smooth Cross-Fade Animation */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait" initial={false}>
            {tab === "signup" ? (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="space-y-4"
              >
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-2 block text-[13px] font-medium text-[#f5f5f5]"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="h-12 w-full rounded-[16px] bg-[#1a1a1a] px-4 text-[15px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-transparent transition-all duration-200 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                  />
                </div>

                {/* Username Field */}
                <div>
                  <label
                    htmlFor="signup-username"
                    className="mb-2 block text-[13px] font-medium text-[#f5f5f5]"
                  >
                    Username
                  </label>
                  <input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    autoComplete="username"
                    className="h-12 w-full rounded-[16px] bg-[#1a1a1a] px-4 text-[15px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-transparent transition-all duration-200 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="mb-2 block text-[13px] font-medium text-[#f5f5f5]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-[16px] bg-[#1a1a1a] pl-4 pr-11 text-[15px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-transparent transition-all duration-200 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070] transition-colors hover:text-[#f5f5f5] focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="mb-2 block text-[13px] font-medium text-[#f5f5f5]"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="h-12 w-full rounded-[16px] bg-[#1a1a1a] pl-4 pr-11 text-[15px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-transparent transition-all duration-200 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070] transition-colors hover:text-[#f5f5f5] focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Create Account Primary Button */}
                <div className="pt-2">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="h-12 w-full rounded-full bg-[#f5f5f5] text-[15px] font-semibold text-[#0a0a0a] transition-colors duration-200 hover:bg-white active:bg-[#e8e8e8]"
                  >
                    Create account
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-fields"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="space-y-4"
              >
                {/* Email / Username Field */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-[13px] font-medium text-[#f5f5f5]"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="username"
                    className="h-12 w-full rounded-[16px] bg-[#1a1a1a] px-4 text-[15px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-transparent transition-all duration-200 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                  />
                </div>

                {/* Password Field with Forgot Link */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="text-[13px] font-medium text-[#f5f5f5]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[12px] text-[#8a8a8a] transition-colors hover:text-[#f5f5f5]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-12 w-full rounded-[16px] bg-[#1a1a1a] pl-4 pr-11 text-[15px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-transparent transition-all duration-200 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070] transition-colors hover:text-[#f5f5f5] focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center pt-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#8a8a8a] select-none hover:text-[#f5f5f5]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded-[6px] border border-white/20 bg-[#1a1a1a] text-foreground accent-foreground focus:ring-0"
                    />
                    <span>Remember this session</span>
                  </label>
                </div>

                {/* Log in Primary Button */}
                <div className="pt-2">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="h-12 w-full rounded-full bg-[#f5f5f5] text-[15px] font-semibold text-[#0a0a0a] transition-colors duration-200 hover:bg-white active:bg-[#e8e8e8]"
                  >
                    Log in
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Bottom Switcher Note (Inside Card) */}
        <div className="mt-6 text-center text-[13px] text-[#8a8a8a]">
          {tab === "signup" ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => handleTabSwitch("login")}
                className="font-medium text-[#f5f5f5] underline-offset-4 hover:underline transition-colors"
              >
                Log in.
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => handleTabSwitch("signup")}
                className="font-medium text-[#f5f5f5] underline-offset-4 hover:underline transition-colors"
              >
                Sign up.
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

