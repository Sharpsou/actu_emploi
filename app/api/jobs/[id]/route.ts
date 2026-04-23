import { NextResponse } from "next/server";
import { getJobDetail } from "@/src/services/jobs/get-job-detail";

type JobDetailRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: JobDetailRouteProps) {
  const { id } = await params;
  const detail = getJobDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
