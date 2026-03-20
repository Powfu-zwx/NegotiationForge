import { NextResponse } from "next/server";

import { readLocalLLMConfig, saveLocalLLMConfig } from "@/lib/local-files";
import { type LocalLLMConfig } from "@/lib/local-types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await readLocalLLMConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to read local config.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as LocalLLMConfig;
    const saved = await saveLocalLLMConfig(payload);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to save local config.",
      },
      { status: 400 }
    );
  }
}
