import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const allBookings = await db.query.bookings.findMany({
    orderBy: (b, { desc }) => [desc(b.bookedAt)],
  });

  return NextResponse.json(allBookings);
}
