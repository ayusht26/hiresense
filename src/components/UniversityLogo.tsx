import { useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { findUniversityByName } from "@/data/universities";

interface UniversityLogoProps {
  name: string;
  domain?: string;
  logoUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UniversityLogo({
  name,
  domain: propDomain,
  logoUrl: propLogoUrl,
  className = "",
  size = "md",
}: UniversityLogoProps) {
  const [errorCount, setErrorCount] = useState(0);

  // Look up university from dataset
  const matched = findUniversityByName(name);
  const domain = propDomain || matched?.domain || null;
  const primaryLogo = propLogoUrl || matched?.logo || null;

  // Reset error when name or domain changes
  useEffect(() => {
    setErrorCount(0);
  }, [name, domain, primaryLogo]);

  const sizeStyles = {
    sm: "h-10 w-10 min-w-10 rounded-[10px] text-[11px]",
    md: "h-12 w-12 min-w-12 rounded-[12px] text-[13px]",
    lg: "h-14 w-14 min-w-14 rounded-[14px] text-[15px]",
  }[size];

  const imageSizes = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }[size];

  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "UN";

  // Strategy ladder for robust loading:
  // 0: Curated/local logo or explicit unavatar from dataset
  // 1: Direct unavatar.io/{domain}
  // 2: Google S2 128px favicon
  // 3: IconHorse
  // 4: Monogram fallback
  const getCandidateUrl = (): string | null => {
    if (errorCount === 0 && primaryLogo) {
      return primaryLogo;
    }
    if (!domain) return null;

    if (errorCount <= 1) {
      return `https://unavatar.io/${domain}`;
    }
    if (errorCount === 2) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
    if (errorCount === 3) {
      return `https://icon.horse/icon/${domain}`;
    }
    return null;
  };

  const activeUrl = getCandidateUrl();

  return (
    <div
      className={`relative flex items-center justify-center bg-[#ffffff] border border-[rgba(255,255,255,0.15)] p-1.5 shadow-sm overflow-hidden select-none shrink-0 ${sizeStyles} ${className}`}
      title={name}
    >
      {activeUrl && errorCount < 4 ? (
        <img
          src={activeUrl}
          alt={`${name} emblem`}
          className={`${imageSizes} object-contain rounded-[4px]`}
          loading="lazy"
          onError={() => setErrorCount((prev) => prev + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-[#141414] text-[#f5f5f5] font-[650]">
          {initials.length <= 2 ? (
            initials
          ) : (
            <GraduationCap size={18} className="text-[#8a8a8a]" />
          )}
        </div>
      )}
    </div>
  );
}
