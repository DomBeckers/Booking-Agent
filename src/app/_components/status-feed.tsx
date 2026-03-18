"use client";

import type { StatusEvent } from "@/types";
import {
  Search,
  Sparkles,
  ShoppingCart,
  AlertCircle,
  Activity,
} from "lucide-react";

const icons = {
  check: Search,
  found: Sparkles,
  booking: ShoppingCart,
  error: AlertCircle,
  agent_state: Activity,
};

const colors = {
  check: "text-blue-500 bg-blue-50",
  found: "text-green-600 bg-green-50",
  booking: "text-brand-600 bg-brand-50",
  error: "text-red-500 bg-red-50",
  agent_state: "text-gray-500 bg-gray-50",
};

export function StatusFeed({ events }: { events: StatusEvent[] }) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Live Status Feed</h2>
        <span className="text-xs text-gray-400">{events.length} events</span>
      </div>
      <div className="overflow-y-auto max-h-[400px] divide-y divide-gray-50">
        {events.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No events yet. Start the agent to begin watching.
          </div>
        ) : (
          events.map((event, i) => {
            const Icon = icons[event.type] || Activity;
            const color = colors[event.type] || colors.agent_state;
            return (
              <div key={i} className="flex items-start gap-3 px-6 py-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{event.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {event.platform && (
                      <span className="badge-blue">{event.platform.replace("_", " ")}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
