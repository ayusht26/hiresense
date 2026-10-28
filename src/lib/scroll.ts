import type Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export interface ScrollToTargetOptions {
  offset?: number;
  duration?: number;
  immediate?: boolean;
  onComplete?: () => void;
}

export function scrollToTarget(
  target: string | number | HTMLElement,
  options?: ScrollToTargetOptions
): void {
  if (typeof window === "undefined") return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Resolve target if string
  let resolvedTarget: string | number | HTMLElement = target;
  if (typeof target === "string") {
    if (target === "/" || target === "#top" || target === "#" || target === "") {
      resolvedTarget = 0;
    } else if (target.startsWith("/#")) {
      resolvedTarget = target.slice(1); // e.g. '#how'
    }
  }

  // Handle prefers-reduced-motion or explicit immediate jump
  if (reduce || options?.immediate) {
    if (typeof resolvedTarget === "number") {
      window.scrollTo({ top: resolvedTarget, behavior: "auto" });
    } else {
      const el =
        typeof resolvedTarget === "string"
          ? document.querySelector(resolvedTarget)
          : resolvedTarget;
      if (el) {
        el.scrollIntoView({ behavior: "auto" });
      }
    }
    options?.onComplete?.();
    return;
  }

  // Use Lenis if available
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === "function") {
    let lenisTarget: number | HTMLElement | string = resolvedTarget;
    if (typeof resolvedTarget === "string") {
      const el = document.querySelector(resolvedTarget);
      if (el instanceof HTMLElement) {
        lenisTarget = el;
      }
    }

    lenis.scrollTo(lenisTarget, {
      offset: options?.offset ?? 0,
      duration: options?.duration ?? 1.2,
      onComplete: () => {
        options?.onComplete?.();
      },
    });
    return;
  }

  // Fallback to browser smooth scroll
  if (typeof resolvedTarget === "number") {
    window.scrollTo({ top: resolvedTarget, behavior: "smooth" });
    if (options?.onComplete) {
      setTimeout(options.onComplete, 800);
    }
  } else {
    const el =
      typeof resolvedTarget === "string"
        ? document.querySelector(resolvedTarget)
        : resolvedTarget;
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      if (options?.onComplete) {
        setTimeout(options.onComplete, 800);
      }
    } else {
      options?.onComplete?.();
    }
  }
}

