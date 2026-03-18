"use client";

import { Play, Pause, Square, Activity } from "lucide-react";

interface AgentControlsProps {
  status: "running" | "paused" | "stopped";
  startedAt: string | null;
  lastCheckAt: string | null;
  checksCount: number;
  onAction: (action: string) => void;
}

export function AgentControls({
  status,
  startedAt,
  lastCheckAt,
  checksCount,
  onAction,
}: AgentControlsProps) {
  const statusColors = {
    running: "bg-green-100 text-green-800 border-green-200",
    paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
    stopped: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const statusLabels = {
    running: "Watching",
    paused: "Paused",
    stopped: "Stopped",
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${statusColors[status]}`}
            >
              <Activity className="h-3.5 w-3.5" />
              {statusLabels[status]}
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              {startedAt && (
                <span>
                  Started:{" "}
                  {new Date(startedAt).toLocaleTimeString()}
                </span>
              )}
              {lastCheckAt && (
                <span>
                  Last check:{" "}
                  {new Date(lastCheckAt).toLocaleTimeString()}
                </span>
              )}
              <span>Checks: {checksCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === "stopped" && (
              <button
                onClick={() => onAction("start")}
                className="btn-primary"
              >
                <Play className="h-4 w-4" />
                Start Watching
              </button>
            )}
            {status === "running" && (
              <>
                <button
                  onClick={() => onAction("pause")}
                  className="btn-secondary"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
                <button
                  onClick={() => onAction("stop")}
                  className="btn-danger"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              </>
            )}
            {status === "paused" && (
              <>
                <button
                  onClick={() => onAction("resume")}
                  className="btn-primary"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
                <button
                  onClick={() => onAction("stop")}
                  className="btn-danger"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
