import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { credentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptFields } from "@/lib/crypto/vault";
import { z } from "zod";

const createSchema = z.object({
  platform: z.enum(["bc_parks", "buntzen_lake", "poco_rec", "coquitlam_rec"]),
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function GET() {
  const creds = await db.query.credentials.findMany({
    orderBy: (c, { asc }) => [asc(c.platform)],
  });

  // Return without sensitive data
  const safe = creds.map((c) => ({
    id: c.id,
    platform: c.platform,
    enabled: c.enabled,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json(safe);
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

  const { platform, username, password } = parsed.data;

  const { encrypted, iv } = encryptFields({ username, password });

  // Upsert — one credential per platform
  const existing = await db.query.credentials.findFirst({
    where: eq(credentials.platform, platform),
  });

  if (existing) {
    db.update(credentials)
      .set({
        usernameEnc: encrypted.username,
        passwordEnc: encrypted.password,
        iv,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(credentials.id, existing.id))
      .run();

    return NextResponse.json({
      id: existing.id,
      platform,
      enabled: existing.enabled,
    });
  }

  const cred = await db
    .insert(credentials)
    .values({
      platform,
      usernameEnc: encrypted.username,
      passwordEnc: encrypted.password,
      iv,
    })
    .returning()
    .get();

  return NextResponse.json(
    { id: cred.id, platform: cred.platform, enabled: cred.enabled },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const { id, enabled } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.update(credentials)
    .set({ enabled, updatedAt: new Date().toISOString() })
    .where(eq(credentials.id, id))
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.delete(credentials).where(eq(credentials.id, id)).run();
  return NextResponse.json({ success: true });
}
