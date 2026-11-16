"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { LINK_CLASS } from "@/modules/identity/styles";

function subscribeToOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeToOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/**
 * A 16:9 youtube-nocookie embed, never autoplaying, with a "Se videoen på YouTube" link
 * always under it: browsers rarely fire `error` on a cross-origin iframe, so the link is
 * the dependable way out. Offline (or on an iframe error) the player area says the video
 * cannot be shown. The steps on the page stay the text alternative.
 */
export function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  const online = useOnline();
  // The error is remembered per video and connection state, so a new id or coming back
  // online tries the player again.
  const attempt = `${videoId}:${online}`;
  const [failedAttempt, setFailedAttempt] = useState<string | null>(null);
  const failed = failedAttempt === attempt;
  const frameRef = useRef<HTMLIFrameElement>(null);

  // React does not attach `onError` to iframes, so listen on the element itself.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onError = () => setFailedAttempt(attempt);
    frame.addEventListener("error", onError);
    return () => frame.removeEventListener("error", onError);
  }, [attempt, failed]);

  const youtubeLink = (
    <a
      href={youtubeWatchUrl(videoId)}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_CLASS}
    >
      Se videoen på YouTube
    </a>
  );

  return (
    <div className="flex flex-col items-start gap-2">
      {!online || failed ? (
        <div
          className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted p-4 text-center"
          data-testid="video-fallback"
        >
          <p className="text-body text-foreground">Videoen kan ikke vises nå</p>
        </div>
      ) : (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <iframe
            ref={frameRef}
            src={youtubeEmbedUrl(videoId)}
            title={title}
            className="size-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      )}
      {youtubeLink}
    </div>
  );
}
