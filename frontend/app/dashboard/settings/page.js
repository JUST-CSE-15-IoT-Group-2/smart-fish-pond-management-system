"use client";

import { useState, useEffect } from "react";
import { Save, ShieldAlert, CloudRain, BellRing, Wind, CloudFog } from "lucide-react";
import { settingsApi, notificationsApi } from "../../../lib/api";

// Helper for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notiStatus, setNotiStatus] = useState("default");

  // Form state
  const [tempMin, setTempMin] = useState(20);
  const [tempMax, setTempMax] = useState(28);
  const [phMin, setPhMin] = useState(6.5);
  const [phMax, setPhMax] = useState(8.5);
  const [turbidityMax, setTurbidityMax] = useState(60);
  const [rainThreshold, setRainThreshold] = useState(40);
  const [autoOxygenOnRain, setAutoOxygenOnRain] = useState(true);
  const [gatewayIp, setGatewayIp] = useState("192.168.1.45");
  const [mqttPort, setMqttPort] = useState(1883);

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotiStatus(Notification.permission);
    }
    
    settingsApi
      .get()
      .then((data) => {
        if (data.tempMin !== undefined) setTempMin(data.tempMin);
        if (data.tempMax !== undefined) setTempMax(data.tempMax);
        if (data.phMin !== undefined) setPhMin(data.phMin);
        if (data.phMax !== undefined) setPhMax(data.phMax);
        if (data.turbidityMax !== undefined) setTurbidityMax(data.turbidityMax);
        if (data.rainThreshold !== undefined) setRainThreshold(data.rainThreshold);
        if (data.autoOxygenOnRain !== undefined) setAutoOxygenOnRain(data.autoOxygenOnRain);
        if (data.gatewayIp) setGatewayIp(data.gatewayIp);
        if (data.mqttPort) setMqttPort(data.mqttPort);
      })
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleEnableNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotiStatus(permission);
      
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const { publicKey } = await notificationsApi.getVapidKey();
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await notificationsApi.subscribe(subscription);
        alert("Push notifications enabled successfully!");
      } else {
        alert("Notification permission denied.");
      }
    } catch (err) {
      console.error("Failed to enable notifications:", err);
      alert("Error enabling notifications. Check console.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.save({
        tempMin: Number(tempMin),
        tempMax: Number(tempMax),
        phMin: Number(phMin),
        phMax: Number(phMax),
        turbidityMax: Number(turbidityMax),
        rainThreshold: Number(rainThreshold),
        autoOxygenOnRain: Boolean(autoOxygenOnRain),
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
            Manage alarm thresholds, weather automation, and device integrations.
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
          Configurations saved successfully! Synchronizing thresholds across sensor nodes...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Section 1: Water Metric Safe Thresholds */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-brand-forest">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-black text-base">Water Alarm Thresholds</h3>
          </div>
          <p className="text-xs text-black/60 leading-relaxed">
            Define boundary limits for Temperature, pH, Turbidity, and Rain. Out-of-range telemetry triggers immediate alarms.
          </p>

          <div className="space-y-4">
            {/* Temperature Thresholds */}
            <div>
              <span className="text-[11px] font-bold text-brand-forest uppercase tracking-wider block mb-1.5">
                Temperature Boundaries (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                    Min Temp (°C)
                  </label>
                  <input
                    type="number"
                    value={tempMin}
                    onChange={(e) => setTempMin(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                    Max Temp (°C)
                  </label>
                  <input
                    type="number"
                    value={tempMax}
                    onChange={(e) => setTempMax(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* pH Thresholds */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold text-brand-forest uppercase tracking-wider block mb-1.5">
                pH Range Boundaries
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                    Min pH Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={phMin}
                    onChange={(e) => setPhMin(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                    Max pH Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={phMax}
                    onChange={(e) => setPhMax(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Turbidity & Rain Thresholds */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[11px] font-bold text-brand-forest uppercase tracking-wider block mb-1.5">
                Turbidity & Rain Alarm Limits
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                    Max Turbidity (NTU)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={turbidityMax}
                    onChange={(e) => setTurbidityMax(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
                  />
                  <span className="text-[10px] text-black/50 block mt-0.5">Alarm if &ge; limit</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider mb-1">
                    Rain Alarm Limit (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rainThreshold}
                    onChange={(e) => setRainThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
                  />
                  <span className="text-[10px] text-black/50 block mt-0.5">Alarm if &ge; limit</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Rain Sensor & Oxygen Motor Automation */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-blue-600">
            <CloudRain className="w-5 h-5" />
            <h3 className="font-bold text-black text-base">Rain Meter & Oxygen Automation</h3>
          </div>
          <p className="text-xs text-black/60 leading-relaxed">
            When rain intensity meets or exceeds the threshold, the system triggers alarms and automatically starts the oxygen dissolving motor.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-black uppercase tracking-wider">
                  Rain Trigger Threshold (%)
                </label>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {rainThreshold}%
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="100"
                value={rainThreshold}
                onChange={(e) => setRainThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 border border-brand-slate/20 focus:border-brand-forest focus:outline-none text-sm text-black rounded-lg font-semibold"
              />
              <p className="text-[11px] text-black/50 mt-1">
                Motor turns <strong>ON</strong> if rain &ge; {rainThreshold}%, and turns <strong>OFF</strong> when rain drops below {rainThreshold}%.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoOxygenOnRain}
                  onChange={(e) => setAutoOxygenOnRain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-forest focus:ring-brand-forest cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-black flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-brand-forest" />
                    Auto Oxygen Dissolving Pump
                  </span>
                  <span className="text-[11px] text-black/60 block">
                    Automatically control oxygen pump relay based on real-time rain telemetry.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Push Notifications */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-white space-y-4 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2.5 text-brand-forest">
            <BellRing className="w-5 h-5" />
            <h3 className="font-bold text-black text-base">Push Notifications & Alarm Alerts</h3>
          </div>
          <p className="text-xs text-black/60 leading-relaxed">
            Receive push notifications when temperature, pH, or rain thresholds are breached.
          </p>
          
          <div className="flex items-center justify-between p-4 border border-brand-slate/20 rounded-xl bg-gray-50/50">
            <div>
              <p className="text-sm font-bold text-black">Browser & Device Notifications</p>
              <p className="text-xs text-black/60 mt-1">
                Status: <span className="font-semibold uppercase text-brand-forest">{notiStatus}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={notiStatus === "granted"}
              className="px-4 py-2 bg-brand-forest text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-brand-sage transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              {notiStatus === "granted" ? "Enabled" : "Enable Alerts"}
            </button>
          </div>
        </div>

      </div>
    </form>
  );
}
