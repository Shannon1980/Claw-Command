"use client";

import { useEffect, useState } from "react";

interface CertCountdownProps {
  dueDate: string; // ISO date string
}

export default function CertCountdown({ dueDate }: CertCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(dueDate).getTime() - Date.now();

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [dueDate]);

  if (!timeLeft) return null;

  const daysRemaining = timeLeft.days;
  let colorClass = "text-green-400";
  let bgClass = "bg-green-500/10";
  let borderClass = "border-green-500/30";
  let pulseClass = "";

  if (daysRemaining < 3) {
    colorClass = "text-red-400";
    bgClass = "bg-red-500/10";
    borderClass = "border-red-500/30";
    pulseClass = "animate-pulse";
  } else if (daysRemaining < 14) {
    colorClass = "text-amber-400";
    bgClass = "bg-amber-500/10";
    borderClass = "border-amber-500/30";
  }

  return (
    <div
      className={`${bgClass} ${borderClass} border rounded-md px-3 py-2 ${pulseClass}`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-mono font-bold ${colorClass}`}>
          {timeLeft.days}
        </span>
        <div className="text-xs">
          <div className={`font-medium ${colorClass}`}>days</div>
          <div className="text-gray-500 font-mono">
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}
