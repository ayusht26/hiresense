import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssistedPasswordConfirmation } from "@/components/ui/assisted-password-confirmation";

describe("AssistedPasswordConfirmation & Signup Step 2 validation", () => {
  it("shows 'Password must be at least 6 characters.' when matching but too short", () => {
    const handleMatchChange = vi.fn();
    render(
      <AssistedPasswordConfirmation
        id="confirm-pwd"
        password="test"
        value="test"
        onChange={() => {}}
        onMatchChange={handleMatchChange}
      />,
    );

    expect(screen.getByText("Password must be at least 6 characters.")).toBeInTheDocument();
    // onMatchChange should be called with false because length is < 6
    expect(handleMatchChange).toHaveBeenCalledWith(false);
  });

  it("shows 'Passwords match.' when matching and >= 6 characters", () => {
    const handleMatchChange = vi.fn();
    render(
      <AssistedPasswordConfirmation
        id="confirm-pwd"
        password="samanyu"
        value="samanyu"
        onChange={() => {}}
        onMatchChange={handleMatchChange}
      />,
    );

    expect(screen.getByText("Passwords match.")).toBeInTheDocument();
    expect(handleMatchChange).toHaveBeenCalledWith(true);
  });

  it("shows 'Passwords don't match yet.' when they differ", () => {
    const handleMatchChange = vi.fn();
    render(
      <AssistedPasswordConfirmation
        id="confirm-pwd"
        password="samanyu"
        value="samany"
        onChange={() => {}}
        onMatchChange={handleMatchChange}
      />,
    );

    expect(screen.getByText("Passwords don't match yet.")).toBeInTheDocument();
    expect(handleMatchChange).toHaveBeenCalledWith(false);
  });
});
