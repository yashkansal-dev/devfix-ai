import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalysisSession } from "@/components/analysis-session";
import { SessionsLoading } from "@/components/empty-state";

export const metadata: Metadata = { title: "Analysis result" };

export default function AnalysisPage() {
  return <Suspense fallback={<SessionsLoading />}><AnalysisSession /></Suspense>;
}
