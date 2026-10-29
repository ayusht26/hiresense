import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches /login and /signup routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const loginMatches = router.matchRoutes("/login");
    expect(loginMatches.at(-1)?.routeId).not.toBe(rootRouteId);

    const signupMatches = router.matchRoutes("/signup");
    expect(signupMatches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches /dashboard, /student, and /student/$username routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const dashboardMatches = router.matchRoutes("/dashboard");
    expect(dashboardMatches.at(-1)?.routeId).not.toBe(rootRouteId);

    const studentMatches = router.matchRoutes("/student");
    expect(studentMatches.at(-1)?.routeId).not.toBe(rootRouteId);

    const studentProfileMatches = router.matchRoutes("/student/varnit");
    expect(studentProfileMatches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
