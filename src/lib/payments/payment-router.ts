import { db } from "@/lib/db";
import { paymentProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptFields } from "@/lib/crypto/vault";
import type { Platform, DecryptedCard } from "@/types";

export async function getPaymentForPlatform(
  paymentProfileId: string,
  platform: Platform
): Promise<{ card: DecryptedCard; profileId: string } | null> {
  const profile = await db.query.paymentProfiles.findFirst({
    where: eq(paymentProfiles.id, paymentProfileId),
  });

  if (!profile || !profile.enabled) return null;

  // Check if this card is assigned to the platform
  const assigned: string[] = JSON.parse(profile.assignedPlatforms);
  if (assigned.length > 0 && !assigned.includes(platform)) {
    return null;
  }

  // Decrypt card details
  const decrypted = decryptFields(
    {
      cardNumber: profile.cardNumberEnc,
      expiry: profile.expiryEnc,
      cvv: profile.cvvEnc,
      cardholder: profile.cardholderEnc,
    },
    profile.iv
  );

  return {
    card: decrypted as unknown as DecryptedCard,
    profileId: profile.id,
  };
}
