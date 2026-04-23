import { NextResponse } from "next/server";
import { getPublicAppInfo } from "@/src/config/env";

export function GET() {
  return NextResponse.json({
    status: "ok",
    ...getPublicAppInfo()
  });
}
