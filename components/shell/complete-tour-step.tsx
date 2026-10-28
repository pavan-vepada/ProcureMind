"use client";

import { useEffect } from "react";
import { reachStep } from "@/app/rfx/actions";
import type { StageKey } from "@/lib/lifecycle";

/** Ticks off tour steps (and moves the lifecycle on) when the user actually reaches a screen, not on prefetch. */
export function CompleteTourStep({ step, stage }: { step: number; stage?: StageKey }) {
  useEffect(() => {
    void reachStep(step, stage);
  }, [step, stage]);
  return null;
}
