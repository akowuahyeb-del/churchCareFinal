import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import { auth, db } from "../firebase";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setNotifications(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const markAsRead = async (notificationId) => {
    const uid = auth.currentUser?.uid;

    if (!uid) return;

    await updateDoc(
      doc(
        db,
        "users",
        uid,
        "notifications",
        notificationId
      ),
      {
        read: true,
      }
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        !item.read && styles.unreadCard
      ]}
      onPress={() => markAsRead(item.id)}
    >
      <Text style={styles.title}>
        {item.title}
      </Text>

      <Text style={styles.message}>
        {item.message}
      </Text>

      {!item.read && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            NEW
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>
              No notifications yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#fff",
    margin: 12,
    padding: 16,
    borderRadius: 12,
  },

  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4B3F72",
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },

  message: {
    fontSize: 13,
    color: "#666",
  },

  badge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#4B3F72",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});