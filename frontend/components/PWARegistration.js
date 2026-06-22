"use client";

import { useEffect } from "react";
import { notificationsApi } from "../lib/api";

// Helper: Convert URL-safe base64 VAPID key to Uint8Array for PushManager
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

export default function PWARegistration() {
  useEffect(() => {
    // Only run registration in browser environment and if serviceWorker is supported
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const registerPWA = async () => {
      try {
        // 1. Register the Service Worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("[PWA] Service Worker registered with scope:", registration.scope);

        // 2. Request Notification Permission
        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          console.log("[PWA] Notification permission status:", permission);
        }

        if (Notification.permission !== "granted") {
          console.log("[PWA] Push alerts skipped: Notification permission denied.");
          return;
        }

        // 3. Throttle subscription syncs to prevent database spamming (once every 12 hours)
        const SYNC_COOLDOWN = 12 * 60 * 60 * 1000;
        const lastSync = localStorage.getItem("pwa_push_sync_timestamp");
        const now = Date.now();
        if (lastSync && now - Number(lastSync) < SYNC_COOLDOWN) {
          console.log("[PWA] Push subscription is up to date (sync throttled).");
          return;
        }

        // 4. Retrieve VAPID Public Key from Backend
        const { publicKey } = await notificationsApi.getVapidKey();
        if (!publicKey) {
          throw new Error("No VAPID public key received from backend");
        }

        // 5. Subscribe to Web Push
        const convertedKey = urlBase64ToUint8Array(publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        // 6. Post subscription info to backend (will succeed if logged in, fail silently if not)
        await notificationsApi.subscribe(subscription);
        localStorage.setItem("pwa_push_sync_timestamp", String(now));
        console.log("[PWA] Web Push subscription synchronized successfully.");
      } catch (err) {
        console.warn("[PWA] Registration / Push subscription failed:", err.message);
      }
    };

    // Delay registration slightly to allow layout rendering to finish first
    const timer = setTimeout(registerPWA, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
