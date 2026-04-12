import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ configured: false });
  }

  const res = await fetch(
    `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Length": "0",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { configured: true, error: `Token fetch failed: ${res.status}` },
      { status: 500 }
    );
  }

  const token = await res.text();
  return NextResponse.json({ configured: true, token, region });
}
