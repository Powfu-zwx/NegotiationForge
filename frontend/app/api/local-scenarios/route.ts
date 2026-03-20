import { NextResponse } from "next/server";

import {
  createScenarioTemplate,
  listLocalScenarios,
  saveLocalScenario,
} from "@/lib/local-files";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await listLocalScenarios();
    return NextResponse.json({
      ...payload,
      template: createScenarioTemplate(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to read local scenarios.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as { rawJson?: unknown };
    if (typeof payload.rawJson !== "string" || !payload.rawJson.trim()) {
      throw new Error("rawJson is required.");
    }

    const saved = await saveLocalScenario(payload.rawJson);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to save local scenario.",
      },
      { status: 400 }
    );
  }
}
