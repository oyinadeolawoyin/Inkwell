// NotificationsSetup.js
import { useEffect } from "react";
import API_URL from "@/config/api";

// Helper to convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

function NotificationsSetup({ user }) {
  useEffect(() => {
    if (!user) return; // Only run if user is logged in

    async function initPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications are not supported in this browser.");
        return;
      }

      try {
        //Register the service worker
        const registration = await navigator.serviceWorker.register("/service-worker.js");
        console.log("Service Worker registered:", registration);

        //Wait until the service worker is active
        await navigator.serviceWorker.ready;
        console.log("Service Worker is active");

        //Request Notification permission from the user
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("Notification permission not granted");
          return;
        }

        //Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            "BK9ZBlUzUTDR0wmaxAYibmsV6TgD6L_gfHxOjdv3NneNyZbibxUSs8BZ0ZQleTCLRmUWqhXcLZpk622_4blTDYc"
          )
        });

        console.log("Push subscription created:", subscription);

        //Send subscription to your backend
        await fetch(`${API_URL}/notifications/save-subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(subscription)
        });

        console.log("Subscription sent to backend successfully");
      } catch (err) {
        console.error("Push setup error:", err);
      }
    }

    initPush();
  }, [user]);

  return null;
}

export default NotificationsSetup;