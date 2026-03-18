"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pause,
  Play,
  Calendar,
  Users,
  MapPin,
} from "lucide-react";
import {
  PLATFORM_LABELS,
  ACTIVITY_TYPE_LABELS,
  type Platform,
  type ActivityType,
} from "@/types";

interface WatchItem {
  id: string;
  platform: string;
  activityType: string;
  activityName: string;
  preferredDates: string;
  partySize: number;
  sitePrefs: string;
  priority: number;
  paymentProfileId: string | null;
  status: string;
  createdAt: string;
}

interface PaymentProfile {
  id: string;
  label: string;
  lastFour: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    platform: "bc_parks" as Platform,
    activityType: "campsite" as ActivityType,
    activityName: "",
    preferredDates: "",
    partySize: 4,
    paymentProfileId: "",
  });

  const fetchItems = () => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  };

  useEffect(() => {
    fetchItems();
    fetch("/api/payments")
      .then((r) => r.json())
      .then(setProfiles)
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const dates = form.preferredDates
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        preferredDates: dates,
        paymentProfileId: form.paymentProfileId || null,
      }),
    });

    setShowForm(false);
    setForm({
      platform: "bc_parks",
      activityType: "campsite",
      activityName: "",
      preferredDates: "",
      partySize: 4,
      paymentProfileId: "",
    });
    fetchItems();
  };

  const toggleStatus = async (item: WatchItem) => {
    const newStatus = item.status === "active" ? "paused" : "active";
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: newStatus }),
    });
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    fetchItems();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "badge-green";
      case "paused":
        return "badge-yellow";
      case "fulfilled":
        return "badge-blue";
      case "expired":
        return "badge-gray";
      default:
        return "badge-gray";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watch List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Activities the agent is monitoring for availability
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Watch Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card card-body space-y-4">
          <h3 className="font-semibold text-gray-900">New Watch Item</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Platform</label>
              <select
                className="input"
                value={form.platform}
                onChange={(e) =>
                  setForm({ ...form, platform: e.target.value as Platform })
                }
              >
                {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Activity Type</label>
              <select
                className="input"
                value={form.activityType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    activityType: e.target.value as ActivityType,
                  })
                }
              >
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Activity Name / Location</label>
              <input
                className="input"
                placeholder='e.g. "Alice Lake Campground" or "Buntzen Lake Day Pass"'
                value={form.activityName}
                onChange={(e) =>
                  setForm({ ...form, activityName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Preferred Dates (comma-separated)</label>
              <input
                className="input"
                placeholder="2026-07-19, 2026-07-20, 2026-07-26"
                value={form.preferredDates}
                onChange={(e) =>
                  setForm({ ...form, preferredDates: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Party Size</label>
              <input
                type="number"
                className="input"
                min={1}
                max={20}
                value={form.partySize}
                onChange={(e) =>
                  setForm({ ...form, partySize: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <label className="label">Payment Card</label>
              <select
                className="input"
                value={form.paymentProfileId}
                onChange={(e) =>
                  setForm({ ...form, paymentProfileId: e.target.value })
                }
              >
                <option value="">None (watch only)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} (****{p.lastFour})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add to Watch List
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Party
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No watch items yet. Add one to get started.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const dates: string[] = JSON.parse(item.preferredDates);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.activityName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ACTIVITY_TYPE_LABELS[item.activityType as ActivityType]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {PLATFORM_LABELS[item.platform as Platform]}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {dates.length > 0
                          ? dates.join(", ")
                          : "Any"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="h-3.5 w-3.5" />
                        {item.partySize}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={statusBadge(item.status)}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(item.status === "active" ||
                          item.status === "paused") && (
                          <button
                            onClick={() => toggleStatus(item)}
                            className="btn-ghost p-1.5"
                            title={
                              item.status === "active" ? "Pause" : "Resume"
                            }
                          >
                            {item.status === "active" ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="btn-ghost p-1.5 text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
