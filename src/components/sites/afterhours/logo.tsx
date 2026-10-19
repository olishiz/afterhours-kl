"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Logo({ accent = "#d9eda0", className }: { accent?: string; className?: string }) {
  const id = `crescent-${useId().replace(/:/g, "")}`;

  return (
    <span className={cn("inline-flex items-center gap-2 text-current", className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <mask id={id}>
          <rect width="24" height="24" fill="#000" />
          <circle cx="10" cy="13.2" r="6.7" fill="#fff" />
          <circle cx="13.7" cy="10.7" r="5.7" fill="#000" />
        </mask>
        <g mask={`url(#${id})`}>
          <circle cx="10" cy="13.2" r="6.7" fill="currentColor" />
        </g>
        <circle cx="18.4" cy="5.7" r="2.05" fill={accent} />
      </svg>
      <span className="text-[17px] leading-none font-medium tracking-[-0.04em]">afterhours</span>
    </span>
  );
}
