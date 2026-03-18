"use client";

import { useEffect, useState } from "react";
import { Eye, Calendar, Users } from "lucide-react";
import { PLATFORM_LABELS } from "@/types";
import type { Platform } from "@/types";
import Link from "next/link";

interface WatchItem {
  id: string;
  platform: string;
  activityName: string;
  preferredDates: string;
  partySize: number;
  status: string;
}

export function ActiveWatches() {
  const [items, setItems] = useState<WatchItem[]>([]);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  }, []);

  const activeItems = items.filter((i) => i.status === "active");

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Active Watches</h2>
        <Link href="/watchlist" className="text-xs text-brand-600 hover:text-brand-700">
          Manage
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {activeItems.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            No active watch items.{" "}
            <Link href="/watchlist" className="text-brand-600 hover:underline">
              Add one
            </Link>
          </div>
        ) : (
          activeItems.slice(0, 5).map((item) => {
            const dates: string[] = JSON.parse(item.preferredDates);
            return (
              <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                <Eye className="h-4 w-4 text-brand-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.activityName}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>
                      {PLATFORM_LABELS[item.platform as Platform] || item.platform}
                    </span>
                    {dates.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dates.length} date(s)
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.partySize}
                    </span>
                  </div>
                </div>
                <span className="badge-green">Watching</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
