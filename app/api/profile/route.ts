import { NextResponse } from "next/server";
import { addManualProfileSkill } from "@/src/services/profile/add-manual-profile-skill";
import { getCandidateProfile } from "@/src/services/profile/get-candidate-profile";

export function GET() {
  return NextResponse.json(getCandidateProfile());
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = addManualProfileSkill(payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
}
