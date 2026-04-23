import { NextResponse } from "next/server";
import { getCandidateProfile } from "@/src/services/profile/get-candidate-profile";

export function GET() {
  return NextResponse.json(getCandidateProfile());
}
