import { NextRequest, NextResponse } from "next/server";
import { bookingAgent } from "@/lib/agent/booking-agent";
import { db } from "@/lib/db";
import { agentState } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const state = db
    .select()
    .from(agentState)
    .where(eq(agentState.id, 1))
    .get();

  return NextResponse.json({
    status: bookingAgent.getStatus(),
    startedAt: state?.startedAt,
    lastCheckAt: state?.lastCheckAt,
    checksCount: state?.checksCount ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const { action } = await request.json();

  switch (action) {
    case "start":
      await bookingAgent.start();
      return NextResponse.json({ status: "running" });

    case "pause":
      await bookingAgent.pause();
      return NextResponse.json({ status: "paused" });

    case "resume":
      await bookingAgent.resume();
      return NextResponse.json({ status: "running" });

    case "stop":
      await bookingAgent.stop();
      return NextResponse.json({ status: "stopped" });

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
