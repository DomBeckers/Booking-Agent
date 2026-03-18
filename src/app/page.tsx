"use client";

import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { StatusFeed } from "@/components/dashboard/status-feed";
import { AgentControls } from "@/components/dashboard/agent-controls";
import { ActiveWatches } from "@/components/dashboard/active-watches";
import { SpendingSummary } from "@/components/dashboard/spending-summary";

interface AgentInfo {
  status: "running" | "paused" | "stopped";
  startedAt: string | null;
  lastCheckAt: string | null;
  checksCount: number;
}

export default function DashboardPage() {
  const { events, connected } = useWebSocket();
  const [agent, setAgent] = useState<AgentInfo>({
    status: "stopped",
    startedAt: null,
    lastCheckAt: null,
    checksCount: 0,
  });

  const fetchAgentStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agent");
      if (res.ok) setAgent(await res.json());
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchAgentStatus();
  }, [fetchAgentStatus]);

  // Refresh status when we get agent_state events
  useEffect(() => {
    const lastEvent = events[0];
    if (lastEvent?.type === "agent_state") {
      fetchAgentStatus();
    }
  }, [events, fetchAgentStatus]);

  const handleAction = async (action: string) => {
    await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchAgentStatus();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor your booking agent in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      <AgentControls
        status={agent.status}
        startedAt={agent.startedAt}
        lastCheckAt={agent.lastCheckAt}
        checksCount={agent.checksCount}
        onAction={handleAction}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusFeed events={events} />
        <div className="space-y-6">
          <ActiveWatches />
          <SpendingSummary />
        </div>
      </div>
    </div>
  );
}
