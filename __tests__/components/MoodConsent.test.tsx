// __tests__/components/MoodConsent.test.tsx
//
// Moduł nastroju (art. 9 RODO): bez zgody nie można zapisać nastroju;
// po zgodzie zapis działa jak dawniej.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const updateSettings = vi.fn(() => Promise.resolve({ error: null }));
const logMood = vi.fn(() => Promise.resolve());
let consentAt: string | null = null;

vi.mock("@/hooks/db/useSettings", () => ({
  useSettings: () => ({
    settings: { show_mood_tracker: true, mood_options: null, mood_consent_at: consentAt },
    updateSettings,
  }),
}));
vi.mock("@/hooks/db/useMoods", () => ({ useMoods: () => ({ moods: [], logMood, loading: false }) }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ supabase: {}, user: { id: "u" } }) }));
vi.mock("@/providers/ToastProvider", () => ({ useToast: () => ({ toast: { confirm: vi.fn(), error: vi.fn() } }) }));

import MoodWidget from "@/components/widgets/MoodTracker";

beforeEach(() => {
  consentAt = null;
  localStorage.clear();
  updateSettings.mockClear();
  logMood.mockClear();
});

describe("zgoda na moduł nastroju", () => {
  it("bez zgody pokazuje prośbę o zgodę zamiast przycisków nastroju", () => {
    render(<MoodWidget date="2026-10-18" />);
    expect(screen.getByRole("heading", { name: /potrzebna zgoda/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Nastrój:/ })).not.toBeInTheDocument();
  });

  it("wyrażenie zgody zapisuje jej datę i odblokowuje zapis nastroju", () => {
    const { rerender } = render(<MoodWidget date="2026-10-18" />);
    fireEvent.click(screen.getByRole("button", { name: "Wyrażam zgodę na zapis nastroju" }));
    expect(updateSettings).toHaveBeenCalledWith({ mood_consent_at: expect.any(String) });
    rerender(<MoodWidget date="2026-10-18" />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Nastrój:/ })[0]);
    expect(logMood).toHaveBeenCalledWith("2026-10-18", "m1");
  });

  it("ze zgodą zapisaną w bazie od razu pokazuje nastroje", () => {
    consentAt = "2026-10-01T10:00:00.000Z";
    render(<MoodWidget date="2026-10-18" />);
    expect(screen.getAllByRole("button", { name: /^Nastrój:/ })).toHaveLength(6);
  });
});
