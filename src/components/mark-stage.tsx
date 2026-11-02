"use client";

import { useEffect } from "react";
import { markStage } from "@/app/rfx/actions";
import type { StageKey } from "@/lib/lifecycle";

/** Moves the RFx's lifecycle forward when the buyer actually opens a screen (not on link prefetch). */
export function MarkStage({ rfxId, stage }: { rfxId: string; stage: StageKey }) {
  useEffect(() => {
    void markStage(rfxId, stage);
  }, [rfxId, stage]);
  return null;
}
