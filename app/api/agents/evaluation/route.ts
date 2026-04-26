import { NextResponse } from "next/server";
import { evaluateAgenticRelevance } from "@/src/services/agents/evaluate-agentic-relevance";

export function POST() {
  const result = evaluateAgenticRelevance();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
