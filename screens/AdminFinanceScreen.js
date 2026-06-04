import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function AdminFinanceScreen({ route }) {

  const donations = route.params?.donations || [];

  const total = donations.reduce((sum, d) => sum + Number(d.amount), 0);

  const mobileMoney = donations.filter(d => d.method === "Mobile Money").length;
  const card = donations.filter(d => d.method === "Card").length;

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.header}>Finance Dashboard</Text>

      {/* ✅ SUMMARY */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Donations</Text>
        <Text style={styles.cardValue}>₵{total}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.smallCard}>
          <Text>Mobile Money</Text>
          <Text style={styles.cardValue}>{mobileMoney}</Text>
        </View>

        <View style={styles.smallCard}>
          <Text>Card</Text>
          <Text style={styles.cardValue}>{card}</Text>
        </View>
      </View>

      {/* ✅ LIST */}
      <Text style={styles.section}>Recent Donations</Text>

      {donations.map(d => (
        <View key={d.id} style={styles.listItem}>
          <Text style={styles.amount}>₵{d.amount}</Text>
          <Text>{d.method}</Text>
          <Text style={styles.date}>{d.date}</Text>
        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f4f6fb"
  },

  header: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15
  },

  card: {
    backgroundColor: "#4B3F72",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15
  },

  cardTitle: {
    color: "#fff"
  },

  cardValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700"
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15
  },

  smallCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    width: "48%"
  },

  section: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10
  },

  listItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8
  },

  amount: {
    fontWeight: "700"
  },

  date: {
    fontSize: 11,
    color: "#777"
  }

});
``