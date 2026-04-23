import { NextRequest, NextResponse } from "next/server";
import { addCandidateDocument } from "@/src/services/profile/add-candidate-document";
import { readCandidateDocumentFormData } from "@/src/services/profile/read-candidate-document-input";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: unknown;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const parsed = await readCandidateDocumentFormData(formData);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: parsed.error
        },
        { status: 400 }
      );
    }

    payload = parsed.value;
  } else {
    payload = await request.json().catch(() => null);
  }

  const result = addCandidateDocument(payload);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error
      },
      { status: 400 }
    );
  }

  return NextResponse.json(result.value, { status: 201 });
}
