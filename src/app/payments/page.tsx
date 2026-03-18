"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, CreditCard, Shield, DollarSign } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/types";

interface PaymentProfile {
  id: string;
  label: string;
  lastFour: string;
  maxPerTx: number | null;
  monthlyCeiling: number | null;
  assignedPlatforms: string[];
  enabled: boolean;
  createdAt: string;
}

export default function PaymentsPage() {
  const [profiles, setProfiles] = useState<PaymentProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholder: "",
    maxPerTx: "",
    monthlyCeiling: "",
    assignedPlatforms: [] as string[],
  });

  const fetchProfiles = () => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then(setProfiles)
      .catch(() => {});
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maxPerTx: form.maxPerTx ? parseFloat(form.maxPerTx) : null,
        monthlyCeiling: form.monthlyCeiling
          ? parseFloat(form.monthlyCeiling)
          : null,
      }),
    });
    setShowForm(false);
    setForm({
      label: "",
      cardNumber: "",
      expiry: "",
      cvv: "",
      cardholder: "",
      maxPerTx: "",
      monthlyCeiling: "",
      assignedPlatforms: [],
    });
    fetchProfiles();
  };

  const toggleProfile = async (profile: PaymentProfile) => {
    await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: profile.id, enabled: !profile.enabled }),
    });
    fetchProfiles();
  };

  const deleteProfile = async (id: string) => {
    await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
    fetchProfiles();
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      assignedPlatforms: prev.assignedPlatforms.includes(platform)
        ? prev.assignedPlatforms.filter((p) => p !== platform)
        : [...prev.assignedPlatforms, platform],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage prepaid/virtual cards and spending limits
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Card
        </button>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Encrypted Storage</p>
          <p className="mt-0.5 text-blue-700">
            Card details are encrypted with AES-256-GCM before storage. Use a
            prepaid card (like KOHO) for an extra layer of protection — your real
            bank account is never exposed.
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card card-body space-y-4">
          <h3 className="font-semibold text-gray-900">Add Payment Card</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Card Label</label>
              <input
                className="input"
                placeholder='e.g. "KOHO Primary" or "Kids Activities Card"'
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">Card Number</label>
              <input
                className="input"
                placeholder="4XXX XXXX XXXX XXXX"
                value={form.cardNumber}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cardNumber: e.target.value.replace(/\s/g, ""),
                  })
                }
                maxLength={19}
                required
              />
            </div>
            <div>
              <label className="label">Expiry (MM/YY)</label>
              <input
                className="input"
                placeholder="03/28"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                maxLength={5}
                required
              />
            </div>
            <div>
              <label className="label">CVV</label>
              <input
                className="input"
                type="password"
                placeholder="***"
                value={form.cvv}
                onChange={(e) => setForm({ ...form, cvv: e.target.value })}
                maxLength={4}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">Cardholder Name</label>
              <input
                className="input"
                placeholder="John Doe"
                value={form.cardholder}
                onChange={(e) =>
                  setForm({ ...form, cardholder: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="label">Max Per Transaction ($)</label>
              <input
                type="number"
                className="input"
                placeholder="60.00"
                step="0.01"
                min="0"
                value={form.maxPerTx}
                onChange={(e) =>
                  setForm({ ...form, maxPerTx: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Monthly Ceiling ($)</label>
              <input
                type="number"
                className="input"
                placeholder="200.00"
                step="0.01"
                min="0"
                value={form.monthlyCeiling}
                onChange={(e) =>
                  setForm({ ...form, monthlyCeiling: e.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <label className="label">Assign to Platforms</label>
              <p className="text-xs text-gray-500 mb-2">
                Leave empty to use for all platforms
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePlatform(key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      form.assignedPlatforms.includes(key)
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
              Save Card (Encrypted)
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {profiles.length === 0 ? (
          <div className="card card-body text-center text-sm text-gray-400 py-12">
            No payment cards added yet. Add a prepaid card to enable automatic
            booking.
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className={`card card-body ${!profile.enabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      **** **** **** {profile.lastFour}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {profile.maxPerTx && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        ${profile.maxPerTx}/tx
                      </span>
                    )}
                    {profile.monthlyCeiling && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        ${profile.monthlyCeiling}/mo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {profile.assignedPlatforms.length > 0 && (
                      <div className="flex gap-1">
                        {profile.assignedPlatforms.map((p) => (
                          <span key={p} className="badge-blue">
                            {(p as string).replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => toggleProfile(profile)}
                      className={`btn-ghost text-xs ${
                        profile.enabled ? "text-yellow-600" : "text-green-600"
                      }`}
                    >
                      {profile.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteProfile(profile.id)}
                      className="btn-ghost p-1.5 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
