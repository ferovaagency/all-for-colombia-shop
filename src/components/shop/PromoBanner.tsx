import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type PromoBannerItem = {
  id: number | string;
  image: string;
  video?: string;
  link: string;
  alt: string;
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
        "absolute inset-0 block transition-opacity duration-500",
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
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
        />
      )}
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
  return (
    <div className={className}>
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
