"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/types";

interface Booking {
  id: string;
  watchItemId: string;
  platform: string;
  confirmationCode: string | null;
  amountCharged: number;
  paymentProfileId: string;
  status: string;
  bookedAt: string;
  confirmationSent: boolean;
}

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then(setBookings)
      .catch(() => {});
  }, []);

  const totalSpent = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + b.amountCharged, 0);

  const statusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Booking & Spend History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Full record of every booking and payment
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            ${totalSpent.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            Total across {bookings.filter((b) => b.status === "confirmed").length}{" "}
            booking(s)
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Confirmation
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No bookings yet. Start the agent and it will book
                  automatically when slots open up.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {statusIcon(booking.status)}
                      <span className="text-sm capitalize">
                        {booking.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {PLATFORM_LABELS[booking.platform as Platform] ||
                      booking.platform}
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">
                      {booking.confirmationCode || "N/A"}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    ${booking.amountCharged.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.bookedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {booking.confirmationSent ? (
                      <span className="badge-green">Sent</span>
                    ) : (
                      <span className="badge-gray">Pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
