"use client";

import { useEffect } from "react";
import { completeTourStep } from "@/app/rfx/actions";

/** Ticks off tour steps when the user actually reaches this screen (not on link prefetch). */
export function CompleteTourStep({ step }: { step: number }) {
  useEffect(() => {
    void completeTourStep(step);
  }, [step]);
  return null;
}
