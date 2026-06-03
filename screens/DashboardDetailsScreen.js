import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";

export default function DashboardDetailsScreen() {

  const navigation = useNavigation();
  const route = useRoute();

  const { title, monthlyData, weeklyData } = route.params || {};
  const width = Dimensions.get("window").width;

  return (
    <ScrollView style={styles.container}>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      {/* MONTHLY */}
      {monthlyData && (
        <>
          <Text style={styles.section}>Monthly Growth</Text>
          <LineChart
            data={{
              labels: monthlyData.map(x => x[0]),
              datasets: [{ data: monthlyData.map(x => x[1]) }]
            }}
            width={width - 20}
            height={220}
            chartConfig={chartConfig}
          />
        </>
      )}

      {/* WEEKLY */}
      {weeklyData && (
        <>
          <Text style={styles.section}>Weekly Comparison</Text>
          <LineChart
            data={{
              labels: weeklyData.map(x => `W${x[0]}`),
              datasets: [{ data: weeklyData.map(x => x[1]) }]
            }}
            width={width - 20}
            height={220}
            chartConfig={chartConfig}
          />
        </>
      )}

    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: () => "#4B3F72"
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f4f6fb" },
  back: { marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "700" },
  section: { marginTop: 20, marginBottom: 10, fontWeight: "700" }
});