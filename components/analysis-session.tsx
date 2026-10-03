"use client";

import { useSearchParams } from "next/navigation";
import { AnalysisView } from "./analysis-view";

export function AnalysisSession() {
  const searchParams = useSearchParams();
  return <AnalysisView sessionId={searchParams.get("id") ?? ""} />;
}
