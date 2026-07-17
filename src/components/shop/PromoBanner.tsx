import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type PromoBannerItem = {
  id: number | string;
  image: string;
  video?: string;
  link: string;
  alt: string;
  /** Intrinsic aspect ratio "W/H" — drives container height so nothing is cropped. */
  aspectRatio?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function PromoBannerSlide({
  banner,
  active,
  eager,
}: {
  banner: PromoBannerItem;
  active: boolean;
  eager?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const showVideo = banner.video && !reducedMotion;

  return (
    <Link
      to={banner.link}
      className={cn(
        "absolute inset-0 block overflow-hidden transition-opacity duration-500",
        active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
      )}
    >
      {showVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={banner.image}
          className="absolute inset-0 h-full w-full object-cover object-center"
        >
          <source src={banner.video} type="video/mp4" />
        </video>
      ) : (
        <img
          src={banner.image}
          alt={banner.alt}
          className={cn(
            "absolute inset-0 h-full w-full object-contain object-center",
            !reducedMotion && "animate-kenburns",
          )}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </Link>
  );
}

export function PromoBannerSlider({
  banners,
  index,
  onSelect,
  eagerFirst,
  className,
}: {
  banners: PromoBannerItem[];
  index: number;
  onSelect: (i: number) => void;
  eagerFirst?: boolean;
  className?: string;
}) {
  const active = banners[index] ?? banners[0];
  return (
    <div className={cn("relative w-full", className)}>
      {/* Sizer: sets the container height to the active banner's natural aspect ratio */}
      <img
        key={active?.id}
        src={active?.image}
        alt=""
        aria-hidden="true"
        className="block w-full h-auto invisible select-none pointer-events-none"
      />
      {banners.map((banner, i) => (
        <PromoBannerSlide key={banner.id} banner={banner} active={i === index} eager={eagerFirst && i === 0} />
      ))}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Banner ${i + 1}`}
            className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-white" : "w-1.5 bg-white/60")}
          />
        ))}
      </div>
    </div>
  );
}
