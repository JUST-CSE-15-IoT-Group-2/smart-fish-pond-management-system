"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { accountApi } from "../../../lib/api";

export default function AccountPage() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountApi
      .get()
      .then((data) => setAccount(data))
      .catch((err) => console.error("Failed to load account:", err))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-black/40 text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-5 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-black">Operator Profile</h2>
        <p className="text-sm text-black/60 mt-1">
          Review authority levels and system clearance.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-8 rounded-2xl border border-gray-100 bg-white space-y-6 shadow-md flex flex-col items-center text-center">
        {account?.picture ? (
          <img
            src={account.picture}
            alt={account.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-brand-forest/20"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-brand-forest/15 border-4 border-brand-forest/20 flex items-center justify-center text-brand-forest text-4xl font-bold">
            {getInitials(account?.name)}
          </div>
        )}
        <div>
          <h3 className="font-extrabold text-black text-xl">{account?.name || "—"}</h3>
          <p className="text-xs text-black/50 mt-1">Status: Active</p>
        </div>

        <div className="w-full pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-brand-forest text-white shadow-sm">
            <Shield className="w-4 h-4" />
            {account?.role === "admin" ? "Super Admin" : account?.role === "operator" ? "Operator" : "Viewer"}
          </span>
          <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">
            Authority Clearance: Level {account?.role === "admin" ? "3" : account?.role === "operator" ? "2" : "1"}
          </span>
        </div>
      </div>
    </div>
  );
}
