import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spendingLedger, paymentProfiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentMonth } from "@/lib/payments/spending-guard";

export async function GET() {
  const month = getCurrentMonth();

  // Get spending per profile for the current month
  const spending = db
    .select({
      paymentProfileId: spendingLedger.paymentProfileId,
      totalSpent: sql<number>`COALESCE(SUM(${spendingLedger.amount}), 0)`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(spendingLedger)
    .where(eq(spendingLedger.month, month))
    .groupBy(spendingLedger.paymentProfileId)
    .all();

  // Get all profiles with their caps
  const profiles = await db.query.paymentProfiles.findMany();

  const summary = profiles.map((p) => {
    const s = spending.find((s) => s.paymentProfileId === p.id);
    return {
      profileId: p.id,
      label: p.label,
      monthlySpent: s?.totalSpent ?? 0,
      monthlyCeiling: p.monthlyCeiling,
      maxPerTx: p.maxPerTx,
      transactionCount: s?.transactionCount ?? 0,
      month,
    };
  });

  return NextResponse.json(summary);
}
