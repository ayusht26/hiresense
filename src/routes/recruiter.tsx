import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/recruiter")({
  head: () => ({
    meta: [{ title: "Workspace — HireSense" }],
  }),
  component: RecruiterRedirect,
});

function RecruiterRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.2)] border-t-[#f5f5f5]" />
        <p className="text-[14px] text-[#8a8a8a]">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

export default RecruiterRedirect;
