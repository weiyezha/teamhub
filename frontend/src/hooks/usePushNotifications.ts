import { useEffect, useState } from 'react';
import api from '../lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    // Skip service worker in development to avoid stale cache issues
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }
    setSupported(true);

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] registered', reg.scope);
        return reg.pushManager.getSubscription();
      })
      .then((sub) => {
        setSubscribed(!!sub);
      })
      .catch((err) => {
        console.error('[SW] registration failed', err);
      });
  }, []);

  const subscribe = async () => {
    if (!supported) return;
    try {
      const res = await api.get('/api/push/vapid-public-key');
      const publicKey = res.data.public_key;
      if (!publicKey) {
        console.warn('[Push] VAPID public key not configured');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      await api.post('/api/push/subscribe', subscription.toJSON());
      setSubscribed(true);
    } catch (err) {
      console.error('[Push] subscribe failed', err);
    }
  };

  const unsubscribe = async () => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/api/push/unsubscribe', subscription.toJSON());
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[Push] unsubscribe failed', err);
    }
  };

  return { supported, subscribed, subscribe, unsubscribe };
}
