import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptFields, decryptFields } from "@/lib/crypto/vault";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().min(1),
  cardNumber: z.string().min(13).max(19),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/),
  cvv: z.string().min(3).max(4),
  cardholder: z.string().min(1),
  maxPerTx: z.number().positive().nullable().default(null),
  monthlyCeiling: z.number().positive().nullable().default(null),
  assignedPlatforms: z
    .array(z.enum(["bc_parks", "buntzen_lake", "poco_rec", "coquitlam_rec"]))
    .default([]),
});

export async function GET() {
  const profiles = await db.query.paymentProfiles.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // Return masked card info
  const masked = profiles.map((p) => {
    let lastFour = "****";
    try {
      const decrypted = decryptFields({ cardNumber: p.cardNumberEnc }, p.iv);
      lastFour = decrypted.cardNumber.slice(-4);
    } catch {
      // Can't decrypt — show masked
    }

    return {
      id: p.id,
      label: p.label,
      lastFour,
      maxPerTx: p.maxPerTx,
      monthlyCeiling: p.monthlyCeiling,
      assignedPlatforms: JSON.parse(p.assignedPlatforms),
      enabled: p.enabled,
      createdAt: p.createdAt,
    };
  });

  return NextResponse.json(masked);
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

  const { label, cardNumber, expiry, cvv, cardholder, maxPerTx, monthlyCeiling, assignedPlatforms } =
    parsed.data;

  const { encrypted, iv } = encryptFields({
    cardNumber,
    expiry,
    cvv,
    cardholder,
  });

  const profile = await db
    .insert(paymentProfiles)
    .values({
      label,
      cardNumberEnc: encrypted.cardNumber,
      expiryEnc: encrypted.expiry,
      cvvEnc: encrypted.cvv,
      cardholderEnc: encrypted.cardholder,
      iv,
      maxPerTx,
      monthlyCeiling,
      assignedPlatforms: JSON.stringify(assignedPlatforms),
    })
    .returning()
    .get();

  return NextResponse.json(
    {
      id: profile.id,
      label: profile.label,
      lastFour: cardNumber.slice(-4),
      maxPerTx: profile.maxPerTx,
      monthlyCeiling: profile.monthlyCeiling,
      assignedPlatforms,
      enabled: profile.enabled,
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const { id, ...updates } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const setValues: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.label !== undefined) setValues.label = updates.label;
  if (updates.maxPerTx !== undefined) setValues.maxPerTx = updates.maxPerTx;
  if (updates.monthlyCeiling !== undefined) setValues.monthlyCeiling = updates.monthlyCeiling;
  if (updates.enabled !== undefined) setValues.enabled = updates.enabled;
  if (updates.assignedPlatforms !== undefined) {
    setValues.assignedPlatforms = JSON.stringify(updates.assignedPlatforms);
  }

  db.update(paymentProfiles)
    .set(setValues)
    .where(eq(paymentProfiles.id, id))
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.delete(paymentProfiles).where(eq(paymentProfiles.id, id)).run();
  return NextResponse.json({ success: true });
}
