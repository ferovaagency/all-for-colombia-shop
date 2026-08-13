import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogitechHeroVideo } from "@/lib/logitech-hero-videos";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function LogitechVideoHero({ videos }: { videos: LogitechHeroVideo[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = videos[index];
  const hasMultiple = videos.length > 1;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused || reducedMotion) video.pause();
    else video.play().catch(() => undefined);
  }, [index, paused, reducedMotion]);

  if (!active) return null;

  const go = (direction: number) => {
    setIndex((current) => (current + direction + videos.length) % videos.length);
  };

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-neutral-950 text-white"
      aria-roledescription={hasMultiple ? "carrusel" : undefined}
      aria-label="Novedades Logitech"
    >
      <a href={active.href} className="block" aria-label={active.label}>
        <div className="relative aspect-video w-full">
          {reducedMotion ? (
            <img
              src={active.poster}
              alt={active.label}
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
          ) : (
            <video
              key={active.id}
              ref={videoRef}
              autoPlay
              muted
              playsInline
              preload={index === 0 ? "auto" : "metadata"}
              poster={active.poster}
              loop={!hasMultiple}
              onEnded={() => hasMultiple && go(1)}
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
            >
              {active.mobileSrc && (
                <source media="(max-width: 639px)" src={active.mobileSrc} type="video/mp4" />
              )}
              <source src={active.desktopSrc} type="video/mp4" />
            </video>
          )}
        </div>
      </a>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Video anterior"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5" aria-label={`Video ${index + 1} de ${videos.length}`}>
              {videos.map((video, itemIndex) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Ver ${video.label}`}
                  aria-current={itemIndex === index ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full bg-white transition-all",
                    itemIndex === index ? "w-7" : "w-2 opacity-55 hover:opacity-90",
                  )}
                />
              ))}
            </div>
          </>
        )}

        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Reproducir video" : "Pausar video"}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        )}
      </div>
    </section>
  );
}
