import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import { findCompanyByName } from "@/data/companies";

interface CompanyLogoProps {
  name: string;
  domain?: string;
  logoUrl?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function CompanyLogo({
  name,
  domain: propDomain,
  logoUrl: propLogoUrl,
  className = "",
  size = "md",
}: CompanyLogoProps) {
  const [errorCount, setErrorCount] = useState(0);

  // Match against companies dataset
  const matched = findCompanyByName(name);
  const domain = propDomain || matched?.domain || null;
  const primaryLogo = propLogoUrl || matched?.logo || null;

  useEffect(() => {
    setErrorCount(0);
  }, [name, domain, primaryLogo]);

  const sizeStyles = {
    xs: "h-6 w-6 min-w-6 rounded-[6px] text-[10px] p-0.5",
    sm: "h-8 w-8 min-w-8 rounded-[8px] text-[11px] p-1",
    md: "h-11 w-11 min-w-11 rounded-[12px] text-[13px] p-1.5",
    lg: "h-14 w-14 min-w-14 rounded-[14px] text-[15px] p-2",
  }[size];

  const imageSizes = {
    xs: "h-4 w-4",
    sm: "h-6 w-6",
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
      .toUpperCase() || "CO";

  // Strategy ladder for robust company logo loading
  const getCandidateUrl = (): string | null => {
    if (errorCount === 0 && primaryLogo) {
      return primaryLogo;
    }
    if (!domain) {
      // If no domain provided, attempt unavatar with sanitized name
      const guessed = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (guessed && errorCount <= 1) {
        return `https://unavatar.io/${guessed}.com`;
      }
      return null;
    }

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
      className={`relative flex items-center justify-center bg-[#ffffff] border border-[rgba(255,255,255,0.15)] shadow-sm overflow-hidden select-none shrink-0 ${sizeStyles} ${className}`}
      title={name}
    >
      {activeUrl && errorCount < 4 ? (
        <img
          src={activeUrl}
          alt={`${name} logo`}
          className={`${imageSizes} object-contain rounded-[3px]`}
          loading="lazy"
          onError={() => setErrorCount((prev) => prev + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[4px] bg-[#141414] text-[#f5f5f5] font-[650]">
          {initials.length <= 2 ? (
            initials
          ) : (
            <Briefcase size={16} className="text-[#8a8a8a]" />
          )}
        </div>
      )}
    </div>
  );
}

