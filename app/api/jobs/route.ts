import { NextRequest, NextResponse } from "next/server";
import { getTopJobMatches } from "@/src/services/jobs/get-top-job-matches";

export function GET(request: NextRequest) {
  const minScoreValue = request.nextUrl.searchParams.get("min_score");
  const role = request.nextUrl.searchParams.get("role") ?? undefined;
  const source = request.nextUrl.searchParams.get("source") ?? undefined;

  const minScore = minScoreValue ? Number(minScoreValue) : undefined;
  const items = getTopJobMatches({ minScore, role, source });

  return NextResponse.json({
    count: items.length,
    items
  });
}
