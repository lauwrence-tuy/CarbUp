"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  duration?: number;
  className?: string;
};

export function CountUp({ value, duration = 850, className }: CountUpProps) {
  const [current, setCurrent] = useState(value);
  const currentRef = useRef(value);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
      }),
    []
  );

  useEffect(() => {
    let frame = 0;
    const from = currentRef.current;
    const distance = value - from;
    const start = performance.now();

    if (distance === 0) {
      return undefined;
    }

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + distance * eased);

      currentRef.current = next;
      setCurrent(next);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={className}>{formatter.format(current)}</span>;
}
