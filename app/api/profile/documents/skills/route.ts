import { NextResponse } from "next/server";
import { updateCandidateDocumentSkill } from "@/src/services/profile/update-candidate-document-skill";

export async function PATCH(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = updateCandidateDocumentSkill(payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
}
