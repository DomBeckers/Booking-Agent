"use client";

import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import Link from "next/link";

interface SpendingProfile {
  profileId: string;
  label: string;
  monthlySpent: number;
  monthlyCeiling: number | null;
  transactionCount: number;
  month: string;
}

export function SpendingSummary() {
  const [spending, setSpending] = useState<SpendingProfile[]>([]);

  useEffect(() => {
    fetch("/api/spending")
      .then((r) => r.json())
      .then(setSpending)
      .catch(() => {});
  }, []);

  const totalSpent = spending.reduce((sum, s) => sum + s.monthlySpent, 0);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Monthly Spending
        </h2>
        <Link
          href="/payments"
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          Manage
        </Link>
      </div>
      <div className="card-body">
        {spending.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            No payment profiles configured.{" "}
            <Link href="/payments" className="text-brand-600 hover:underline">
              Add a card
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-brand-600" />
              <span className="text-2xl font-bold text-gray-900">
                ${totalSpent.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">this month</span>
            </div>
            {spending.map((s) => {
              const pct =
                s.monthlyCeiling
                  ? Math.min(100, (s.monthlySpent / s.monthlyCeiling) * 100)
                  : 0;
              return (
                <div key={s.profileId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {s.label}
                    </span>
                    <span className="text-gray-500">
                      ${s.monthlySpent.toFixed(2)}
                      {s.monthlyCeiling
                        ? ` / $${s.monthlyCeiling.toFixed(2)}`
                        : ""}
                    </span>
                  </div>
                  {s.monthlyCeiling && (
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 80
                            ? "bg-red-500"
                            : pct > 50
                              ? "bg-yellow-500"
                              : "bg-brand-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
