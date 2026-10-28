import { useState } from "react";
import type { TechStackItem, RequirementType } from "@/types/database.types";

interface TechLogoTileProps {
  item: TechStackItem;
  size?: "sm" | "md" | "lg";
  showRequirementBadge?: boolean;
}

export function TechLogoTile({
  item,
  size = "md",
  showRequirementBadge = true,
}: TechLogoTileProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);

  const slug = item.devicon_slug?.toLowerCase();

  // Primary: original svg, Fallback: plain svg
  const iconUrl = slug
    ? !fallbackTried
      ? `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg`
      : `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-plain.svg`
    : null;

  const handleImageError = () => {
    if (!fallbackTried) {
      setFallbackTried(true);
    } else {
      setImageError(true);
    }
  };

  const initial = (item.canonical_name || item.name || "?").slice(0, 2).toUpperCase();

  const getBadgeStyle = (reqType: RequirementType) => {
    switch (reqType) {
      case "mandatory":
        return "bg-[#1a1a1a] text-[#f5f5f5] border-[rgba(255,255,255,0.20)] font-[600]";
      case "preferred":
        return "bg-[#141414] text-[#8a8a8a] border-[rgba(255,255,255,0.08)] font-[450]";
      case "contextual":
        return "bg-[#141414] text-[#707070] border-[rgba(255,255,255,0.06)] font-[450]";
      case "informational":
      default:
        return "bg-[#141414] text-[#5c5c5c] border-transparent font-[450]";
    }
  };

  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-[12px]",
    lg: "h-11 w-11 text-[14px]",
  }[size];

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-[16px] bg-[#141414] border border-[rgba(255,255,255,0.08)] transition-all hover:border-[rgba(255,255,255,0.16)]">
      {/* 30% Squircle Tile with Light Neutral Fill so dark logos (GitHub, Flask, Express) pop */}
      <div
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-[30%] bg-[#f0f0f0] text-[#141414] font-[650] shadow-sm select-none overflow-hidden p-1.5`}
      >
        {iconUrl && !imageError ? (
          <img
            src={iconUrl}
            alt={item.canonical_name}
            className={`${iconSizes} object-contain`}
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Name and Metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-[600] text-[#f5f5f5] truncate">
            {item.canonical_name || item.name}
          </span>
          {showRequirementBadge && item.requirement_type && (
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(
                item.requirement_type,
              )}`}
            >
              {item.requirement_type}
            </span>
          )}
        </div>
        {item.category && item.category !== "other" && (
          <span className="text-[11px] font-[450] text-[#707070] capitalize block mt-0.5">
            {item.category.replace("_", " ")}
          </span>
        )}
      </div>
    </div>
  );
}

