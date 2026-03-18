import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const all = await db.query.notifications.findMany({
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });
  return NextResponse.json(all);
}

export async function PATCH(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .run();

  return NextResponse.json({ success: true });
}
