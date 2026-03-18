"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2, Check, Shield } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/types";

interface Credential {
  id: string;
  platform: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const platforms: Platform[] = [
  "bc_parks",
  "buntzen_lake",
  "poco_rec",
  "coquitlam_rec",
];

export default function SettingsPage() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [editPlatform, setEditPlatform] = useState<Platform | null>(null);
  const [form, setForm] = useState({ username: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const fetchCreds = () => {
    fetch("/api/credentials")
      .then((r) => r.json())
      .then(setCreds)
      .catch(() => {});
  };

  useEffect(() => {
    fetchCreds();
  }, []);

  const handleSave = async (platform: Platform) => {
    setSaving(true);
    await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, ...form }),
    });
    setSaving(false);
    setSaved(platform);
    setEditPlatform(null);
    setForm({ username: "", password: "" });
    fetchCreds();
    setTimeout(() => setSaved(null), 2000);
  };

  const toggleCred = async (cred: Credential) => {
    await fetch("/api/credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cred.id, enabled: !cred.enabled }),
    });
    fetchCreds();
  };

  const deleteCred = async (id: string) => {
    await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    fetchCreds();
  };

  const getCredForPlatform = (platform: Platform) =>
    creds.find((c) => c.platform === platform);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform credentials and configuration
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Credentials Vault</p>
          <p className="mt-0.5 text-blue-700">
            Usernames and passwords are encrypted with AES-256-GCM before
            storage. They are only decrypted in memory when the agent needs to
            log in.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {platforms.map((platform) => {
          const cred = getCredForPlatform(platform);
          const isEditing = editPlatform === platform;

          return (
            <div key={platform} className="card card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                    <KeyRound className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {PLATFORM_LABELS[platform]}
                    </p>
                    {cred ? (
                      <p className="text-xs text-gray-500">
                        Configured on{" "}
                        {new Date(cred.updatedAt).toLocaleDateString()}
                        {!cred.enabled && (
                          <span className="text-yellow-600 ml-2">
                            (disabled)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Not configured</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {saved === platform && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  )}
                  {cred && (
                    <>
                      <button
                        onClick={() => toggleCred(cred)}
                        className={`btn-ghost text-xs ${cred.enabled ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {cred.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => deleteCred(cred.id)}
                        className="btn-ghost p-1.5 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      setEditPlatform(isEditing ? null : platform)
                    }
                    className="btn-secondary text-xs"
                  >
                    {cred ? "Update" : "Add Credentials"}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  <div>
                    <label className="label">Email / Username</label>
                    <input
                      className="input"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input
                      className="input"
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="********"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditPlatform(null)}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(platform)}
                      disabled={saving || !form.username || !form.password}
                      className="btn-primary text-xs"
                    >
                      {saving ? "Encrypting..." : "Save (Encrypted)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card card-body">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Email Notifications
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          Configure SMTP settings in your <code className="text-xs bg-gray-100 px-1 rounded">.env.local</code> file:
        </p>
        <pre className="rounded-lg bg-gray-900 p-4 text-xs text-gray-300 overflow-x-auto">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=your-email@gmail.com`}
        </pre>
      </div>
    </div>
  );
}
