import { NextRequest, NextResponse } from "next/server";
import { getDailyFeed } from "@/src/services/feed/get-daily-feed";

export function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "2026-04-22";
  const kind = request.nextUrl.searchParams.get("kind") ?? undefined;
  const source = request.nextUrl.searchParams.get("source") ?? undefined;

  const items = getDailyFeed({ date, kind, source });

  return NextResponse.json({
    date,
    count: items.length,
    items
  });
}
