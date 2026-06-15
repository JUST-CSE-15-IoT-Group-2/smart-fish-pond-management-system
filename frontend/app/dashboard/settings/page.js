"use client";

import { useState, useEffect } from "react";
import { Save, ShieldAlert, Wifi } from "lucide-react";
import { settingsApi } from "../../../lib/api";

export default function SettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [tempMin, setTempMin] = useState(20);
  const [tempMax, setTempMax] = useState(28);
  const [phMin, setPhMin] = useState(6.5);
  const [phMax, setPhMax] = useState(8.5);
  const [gatewayIp, setGatewayIp] = useState("192.168.1.45");
  const [mqttPort, setMqttPort] = useState(1883);

  // Load settings on mount
  useEffect(() => {
    settingsApi
      .get()
      .then((data) => {
        setTempMin(data.tempMin);
        setTempMax(data.tempMax);
        setPhMin(data.phMin);
        setPhMax(data.phMax);
        setGatewayIp(data.gatewayIp);
        setMqttPort(data.mqttPort);
      })
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.save({
        tempMin,
        tempMax,
        phMin,
        phMax,
        gatewayIp,
        mqttPort: Number(mqttPort),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-black/40 text-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-black">System Configurations</h2>
          <p className="text-sm text-black/60 mt-1">
            Manage alarm thresholds and network integrations.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-forest hover:bg-brand-sage text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-70"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-brand-sage/20 border border-brand-sage text-black font-semibold rounded-xl flex items-center gap-3 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-forest"></span>
          Configurations saved successfully! Synchronizing thresholds across local nodes...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Section 1: Network Gateway */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-brand-forest">
            <Wifi className="w-5 h-5" />
            <h3 className="font-bold text-black text-base">IoT Gateway Network</h3>
          </div>
          <p className="text-xs text-black/60 leading-relaxed">
            Set local network variables to allow connection sync with local node microcontrollers.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                Gateway IPv4 Address
              </label>
              <input
                type="text"
                value={gatewayIp}
                onChange={(e) => setGatewayIp(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black"
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                MQTT Broker Port
              </label>
              <input
                type="number"
                value={mqttPort}
                onChange={(e) => setMqttPort(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black"
                placeholder="1883"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Sensor Thresholds */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-brand-forest">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-black text-base">Alarm Safe Thresholds</h3>
          </div>
          <p className="text-xs text-black/60 leading-relaxed">
            Define boundaries for critical metrics. Out of range telemetry triggers system warnings.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                  Min Temp (°C)
                </label>
                <input
                  type="number"
                  value={tempMin}
                  onChange={(e) => setTempMin(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                  Max Temp (°C)
                </label>
                <input
                  type="number"
                  value={tempMax}
                  onChange={(e) => setTempMax(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                  Min pH Value
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phMin}
                  onChange={(e) => setPhMin(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                  Max pH Value
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phMax}
                  onChange={(e) => setPhMax(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
