import { describe, expect, it, vi, beforeEach } from "vitest";
import { scrollToTarget } from "@/lib/scroll";

describe("scrollToTarget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls lenis.scrollTo when lenis is available on window", () => {
    const scrollToMock = vi.fn();
    (window as unknown as { __lenis: unknown }).__lenis = {
      scrollTo: scrollToMock,
    };

    scrollToTarget("#how", { duration: 1.2 });

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith(
      "#how",
      expect.objectContaining({
        duration: 1.2,
        offset: 0,
      }),
    );
  });

  it("resolves '/#faq' to '#faq' and calls lenis.scrollTo", () => {
    const scrollToMock = vi.fn();
    (window as unknown as { __lenis: unknown }).__lenis = {
      scrollTo: scrollToMock,
    };

    scrollToTarget("/#faq");

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith(
      "#faq",
      expect.objectContaining({
        offset: 0,
      }),
    );
  });

  it("resolves '/' or '#top' to 0 for scrolling to top", () => {
    const scrollToMock = vi.fn();
    (window as unknown as { __lenis: unknown }).__lenis = {
      scrollTo: scrollToMock,
    };

    scrollToTarget("/");
    expect(scrollToMock).toHaveBeenCalledWith(0, expect.anything());

    scrollToTarget("#top");
    expect(scrollToMock).toHaveBeenCalledWith(0, expect.anything());
  });

  it("falls back to window.scrollTo when lenis is not available and target is a number", () => {
    delete (window as unknown as { __lenis?: unknown }).__lenis;
    const windowScrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    scrollToTarget(0);

    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
