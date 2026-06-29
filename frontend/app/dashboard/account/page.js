"use client";

import { useState, useEffect } from "react";
import { Key, Shield, User, Copy, Check, RefreshCw } from "lucide-react";
import { accountApi } from "../../../lib/api";

export default function AccountPage() {
  const [copiedKey, setCopiedKey] = useState(false);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    accountApi
      .get()
      .then((data) => setAccount(data))
      .catch((err) => console.error("Failed to load account:", err))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = () => {
    if (!account?.apiKey) return;
    navigator.clipboard.writeText(account.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    setRegenerating(true);
    try {
      const data = await accountApi.regenerateKey();
      setAccount((prev) => ({ ...prev, apiKey: data.apiKey }));
    } catch (err) {
      console.error("Failed to regenerate key:", err);
    } finally {
      setRegenerating(false);
    }
  };

  // Initials from name
  const getInitials = (name) => {
    if (!name) return "OP";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-black/40 text-sm">
        Loading account...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-black">Operator Account</h2>
        <p className="text-sm text-black/60 mt-1">
          Review operator authority levels, credentials, and API access tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Profile Card */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-5 shadow-sm md:col-span-1 flex flex-col items-center text-center">
          {account?.picture ? (
            <img
              src={account.picture}
              alt={account.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-brand-forest"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-brand-forest/15 border-2 border-brand-forest flex items-center justify-center text-brand-forest text-3xl font-bold">
              {getInitials(account?.name)}
            </div>
          )}
          <div>
            <h3 className="font-bold text-black text-lg">{account?.name || "—"}</h3>
            <p className="text-xs text-black/50 mt-1">Registered: {formatJoinDate(account?.createdAt)}</p>
          </div>

          <div className="w-full pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-forest text-white">
              <Shield className="w-3.5 h-3.5" />
              {account?.role === "admin" ? "Super Admin" : account?.role === "operator" ? "Operator" : "Viewer"}
            </span>
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">
              Auth clearance: lv. {account?.role === "admin" ? "3" : account?.role === "operator" ? "2" : "1"}
            </span>
          </div>
        </div>

        {/* Account Details */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-6 shadow-sm md:col-span-2">
          {/* Identity */}
          <div className="space-y-4">
            <h3 className="font-bold text-black text-base flex items-center gap-2.5">
              <User className="w-5 h-5 text-brand-forest" />
              Identity Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1">
                  Full Operator Name
                </span>
                <p className="text-sm font-semibold text-black p-3 bg-gray-50 border border-gray-200/50 rounded-xl">
                  {account?.name || "—"}
                </p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-black uppercase tracking-wider mb-1">
                  Security Email
                </span>
                <p className="text-sm font-semibold text-black p-3 bg-gray-50 border border-gray-200/50 rounded-xl truncate">
                  {account?.email || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="font-bold text-black text-base flex items-center gap-2.5">
              <Key className="w-5 h-5 text-brand-forest" />
              Network Integration Secret Token
            </h3>

            <p className="text-xs text-black/60 leading-relaxed">
              Use this key to authorize IoT device commands sent to the pond system via the <code className="bg-gray-100 px-1 rounded text-[11px]">X-API-Key</code> header. Keep this token secret!
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 font-mono text-xs p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-black select-all break-all overflow-hidden flex items-center">
                <span>{account?.apiKey || "—"}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-brand-slate hover:bg-brand-forest text-white rounded-xl transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="text-xs font-bold uppercase tracking-wider sm:hidden">Copy Key</span>
                </button>

                <button
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                  className="px-4 py-3 bg-white hover:bg-gray-50 border border-brand-slate/20 text-black rounded-xl transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none disabled:opacity-70"
                >
                  <RefreshCw className={`w-4 h-4 text-black ${regenerating ? "animate-spin" : ""}`} />
                  <span className="text-xs font-bold uppercase tracking-wider sm:hidden">Regen Key</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-black/40 leading-relaxed">
              IoT devices (ESP32, Raspberry Pi, etc.) use this key in <code className="bg-gray-100 px-1 rounded">POST /api/sensors/reading</code> to push live telemetry data.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
