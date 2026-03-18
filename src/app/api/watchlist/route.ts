import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  platform: z.enum(["bc_parks", "buntzen_lake", "poco_rec", "coquitlam_rec"]),
  activityType: z.enum(["campsite", "day_use", "swim", "skate", "program"]),
  activityName: z.string().min(1),
  preferredDates: z.array(z.string()).default([]),
  partySize: z.number().int().min(1).default(1),
  sitePrefs: z.record(z.unknown()).default({}),
  priority: z.number().int().min(1).max(10).default(5),
  paymentProfileId: z.string().nullable().default(null),
});

export async function GET() {
  const items = await db.query.watchItems.findMany({
    orderBy: (items, { desc }) => [desc(items.createdAt)],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const item = await db
    .insert(watchItems)
    .values({
      ...parsed.data,
      preferredDates: JSON.stringify(parsed.data.preferredDates),
      sitePrefs: JSON.stringify(parsed.data.sitePrefs),
    })
    .returning()
    .get();

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, ...updates } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (updates.preferredDates) {
    updates.preferredDates = JSON.stringify(updates.preferredDates);
  }
  if (updates.sitePrefs) {
    updates.sitePrefs = JSON.stringify(updates.sitePrefs);
  }
  updates.updatedAt = new Date().toISOString();

  const item = db
    .update(watchItems)
    .set(updates)
    .where(eq(watchItems.id, id))
    .returning()
    .get();

  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.delete(watchItems).where(eq(watchItems.id, id)).run();
  return NextResponse.json({ success: true });
}
