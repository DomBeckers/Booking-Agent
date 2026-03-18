import { db } from "@/lib/db";
import { spendingLedger, paymentProfiles } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface SpendingCheckResult {
  approved: boolean;
  reason?: string;
  monthlySpent: number;
  monthlyRemaining: number;
  perTxLimit: number | null;
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // '2026-03'
}

export async function checkSpendingCap(
  paymentProfileId: string,
  amount: number
): Promise<SpendingCheckResult> {
  const month = getCurrentMonth();

  // Get payment profile
  const profile = await db.query.paymentProfiles.findFirst({
    where: eq(paymentProfiles.id, paymentProfileId),
  });

  if (!profile) {
    return {
      approved: false,
      reason: "Payment profile not found",
      monthlySpent: 0,
      monthlyRemaining: 0,
      perTxLimit: null,
    };
  }

  if (!profile.enabled) {
    return {
      approved: false,
      reason: "Payment profile is disabled",
      monthlySpent: 0,
      monthlyRemaining: 0,
      perTxLimit: profile.maxPerTx,
    };
  }

  // Check per-transaction limit
  if (profile.maxPerTx !== null && amount > profile.maxPerTx) {
    return {
      approved: false,
      reason: `Amount $${amount.toFixed(2)} exceeds per-transaction limit of $${profile.maxPerTx.toFixed(2)}`,
      monthlySpent: 0,
      monthlyRemaining: profile.monthlyCeiling ?? Infinity,
      perTxLimit: profile.maxPerTx,
    };
  }

  // Check monthly ceiling
  if (profile.monthlyCeiling !== null) {
    const result = db
      .select({
        total: sql<number>`COALESCE(SUM(${spendingLedger.amount}), 0)`,
      })
      .from(spendingLedger)
      .where(
        and(
          eq(spendingLedger.paymentProfileId, paymentProfileId),
          eq(spendingLedger.month, month)
        )
      )
      .get();

    const monthlySpent = result?.total ?? 0;
    const monthlyRemaining = (profile.monthlyCeiling ?? 0) - monthlySpent;

    if (amount > monthlyRemaining) {
      return {
        approved: false,
        reason: `Amount $${amount.toFixed(2)} would exceed monthly ceiling. Spent: $${monthlySpent.toFixed(2)} / $${profile.monthlyCeiling!.toFixed(2)}`,
        monthlySpent,
        monthlyRemaining: Math.max(0, monthlyRemaining),
        perTxLimit: profile.maxPerTx,
      };
    }

    return {
      approved: true,
      monthlySpent,
      monthlyRemaining: monthlyRemaining - amount,
      perTxLimit: profile.maxPerTx,
    };
  }

  return {
    approved: true,
    monthlySpent: 0,
    monthlyRemaining: Infinity,
    perTxLimit: profile.maxPerTx,
  };
}

export async function recordSpending(
  paymentProfileId: string,
  bookingId: string,
  amount: number
): Promise<void> {
  const month = getCurrentMonth();
  await db.insert(spendingLedger).values({
    paymentProfileId,
    bookingId,
    amount,
    month,
  });
}
