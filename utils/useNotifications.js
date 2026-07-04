// hooks/useNotifications.js
//
// ✅ Real-time unread count + notification list for the current member.
// Import this in HomeScreen (or AppHeader) to drive the badge on the
// bell icon — the same one that's already wired in HomeScreen.js.

import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDocs, writeBatch
} from "firebase/firestore";

export function useNotifications(organizationId, memberId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  useEffect(() => {
    if (!organizationId || !memberId) return;

    const q = query(
      collection(db, "organizations", organizationId, "notifications", memberId, "items"),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, snap => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setNotifications(items);
      setUnreadCount(items.length);
    }, e => {
      console.log("❌ useNotifications:", e);
    });

    return () => unsub();
  }, [organizationId, memberId]);

  const markAllRead = async () => {
    if (!organizationId || !memberId || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.update(
          doc(db, "organizations", organizationId, "notifications", memberId, "items", n.id),
          { read: true }
        );
      });
      await batch.commit();
    } catch (e) {
      console.log("❌ markAllRead:", e);
    }
  };

  return { notifications, unreadCount, markAllRead };
}