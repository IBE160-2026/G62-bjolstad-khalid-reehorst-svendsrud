import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { GET: getMock } }));

import { ExerciseDetail, SAFETY_NOTE, musclesText } from "./exercise-detail";
import { VideoEmbed } from "./video-embed";

const PUSH_UP_ID = "00000000-0000-4000-8000-000000000002";
const PUSH_UP = {
  id: PUSH_UP_ID,
  name: "Armhevinger (Push-up)",
  level: "beginner",
  type: "reps",
  primary_muscle_group: "Bryst",
  secondary_muscle_groups: ["Skuldre", "Armer"],
  equipment: ["Kroppsvekt"],
  steps: ["Sett hendene i gulvet.", "Senk brystet.", "Press deg opp."],
  video_id: "YwFmEsa_lIk",
};

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
}

afterEach(() => {
  getMock.mockReset();
  setOnline(true);
});

describe("ExerciseDetail", () => {
  it("shows video, steps, muscles, equipment, level and the safety note", async () => {
    getMock.mockResolvedValue({ data: PUSH_UP, error: undefined });
    renderWithClient(<ExerciseDetail id={PUSH_UP_ID} />);

    expect(
      await screen.findByRole("heading", { name: "Armhevinger (Push-up)" }),
    ).toBeInTheDocument();
    const video = screen.getByTitle("Video: Armhevinger (Push-up)");
    expect(video).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/YwFmEsa_lIk",
    );
    expect(video.getAttribute("src")).not.toContain("autoplay");
    const steps = within(
      screen.getByRole("region", { name: "Slik gjør du det" }),
    ).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual(PUSH_UP.steps);
    expect(screen.getByRole("region", { name: "Muskler som jobber" })).toHaveTextContent(
      "Hovedmuskel: Bryst · Hjelper til: Skuldre, Armer",
    );
    expect(screen.getByText("Kroppsvekt")).toBeInTheDocument();
    expect(screen.getByText("Nybegynner")).toBeInTheDocument();
    expect(screen.getByTestId("safety-note")).toHaveTextContent(SAFETY_NOTE);
    expect(SAFETY_NOTE).toBe(
      "Dette er generelle råd, ikke en erstatning for lege eller fysioterapeut. Start med lav vekt og øk rolig.",
    );
    // The video comes before the steps.
    const order = video.compareDocumentPosition(steps[0]);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getMock).toHaveBeenCalledWith("/api/exercises/{exercise_id}", {
      params: { path: { exercise_id: PUSH_UP_ID } },
    });
  });

  it("shows the not-found message and a way back, not a retry, for an unknown id", async () => {
    // What GET /api/exercises/ukjent answers: 404 with the error envelope.
    getMock.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "exercise_not_found",
          message: "Fant ikke øvelsen. Gå tilbake til Trening og velg en øvelse.",
        },
      },
      response: new Response(null, { status: 404 }),
    });
    renderWithClient(<ExerciseDetail id="ukjent" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Fant ikke øvelsen. Gå tilbake til Trening og velg en øvelse.",
    );
    expect(screen.getByRole("link", { name: "Gå tilbake til Trening" })).toHaveAttribute(
      "href",
      "/trening",
    );
    expect(screen.queryByRole("button", { name: "Prøv igjen" })).not.toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/api/exercises/{exercise_id}", {
      params: { path: { exercise_id: "ukjent" } },
    });
  });

  it("writes only the main muscle when nothing helps", () => {
    expect(musclesText({ primary_muscle_group: "Armer", secondary_muscle_groups: [] })).toBe(
      "Hovedmuskel: Armer",
    );
  });
});

describe("VideoEmbed", () => {
  it("always links to the video on YouTube under the player", () => {
    render(<VideoEmbed videoId="YwFmEsa_lIk" title="Video: Armhevinger" />);

    expect(screen.getByTitle("Video: Armhevinger")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Se videoen på YouTube" });
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=YwFmEsa_lIk");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back when the iframe fails and tries again for another video", () => {
    const { rerender } = render(
      <VideoEmbed videoId="YwFmEsa_lIk" title="Video: Armhevinger" />,
    );

    fireEvent.error(screen.getByTitle("Video: Armhevinger"));

    expect(screen.queryByTitle("Video: Armhevinger")).not.toBeInTheDocument();
    expect(screen.getByText("Videoen kan ikke vises nå")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se videoen på YouTube" })).toBeInTheDocument();

    rerender(<VideoEmbed videoId="mwlp75MS6Rg" title="Video: Planke" />);
    expect(screen.getByTitle("Video: Planke")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/mwlp75MS6Rg",
    );
  });

  it("falls back when offline and returns when back online", () => {
    setOnline(false);
    render(<VideoEmbed videoId="YwFmEsa_lIk" title="Video: Armhevinger" />);

    expect(screen.getByText("Videoen kan ikke vises nå")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se videoen på YouTube" })).toBeInTheDocument();

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByTitle("Video: Armhevinger")).toBeInTheDocument();
  });

  it("keeps the steps on the page when the video fails", async () => {
    getMock.mockResolvedValue({ data: PUSH_UP, error: undefined });
    renderWithClient(<ExerciseDetail id={PUSH_UP_ID} />);

    fireEvent.error(await screen.findByTitle("Video: Armhevinger (Push-up)"));

    expect(screen.getByText("Videoen kan ikke vises nå")).toBeInTheDocument();
    expect(screen.getByText("Press deg opp.")).toBeInTheDocument();
    expect(screen.getByTestId("safety-note")).toBeInTheDocument();
  });
});
