import { useEffect, useState } from "react";

function pad(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export function useCountdown(target: string | Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const ms = target ? new Date(target).getTime() - now : 0;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { ms, totalSec, days, hours, minutes, seconds, done: ms <= 0 };
}

type Props = {
  target: string | Date;
  urgent?: boolean;
  compact?: boolean;
};

export function Countdown({ target, urgent, compact }: Props) {
  const { days, hours, minutes, seconds } = useCountdown(target);
  const isUrgent = urgent;
  const box = compact
    ? "px-3 py-2 min-w-[56px]"
    : "px-4 py-3 md:px-6 md:py-4 min-w-[72px] md:min-w-[92px]";
  const num = compact ? "text-2xl" : "text-3xl md:text-5xl";
  const label = compact ? "text-[10px]" : "text-[10px] md:text-xs";

  return (
    <div
      className={`inline-flex items-stretch gap-2 md:gap-3 ${
        isUrgent ? "text-white" : "text-white"
      }`}
    >
      {[
        { v: days, l: "Días" },
        { v: hours, l: "Horas" },
        { v: minutes, l: "Min" },
        { v: seconds, l: "Seg" },
      ].map((s, i) => (
        <div
          key={i}
          className={`flex flex-col items-center justify-center rounded-xl border ${box} ${
            isUrgent
              ? "bg-red-600 border-red-500 shadow-lg shadow-red-500/30 animate-pulse"
              : "bg-white/10 border-white/20 backdrop-blur"
          }`}
        >
          <span className={`font-bold tabular-nums leading-none ${num}`}>{pad(s.v)}</span>
          <span className={`uppercase tracking-widest mt-1 ${label} opacity-80`}>{s.l}</span>
        </div>
      ))}
    </div>
  );
}
