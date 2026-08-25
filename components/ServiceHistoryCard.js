import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

export default function ServiceHistoryCard({
  activeRoles = [],
  previousRoles = [],
}) {

  const totalAppointments =
    activeRoles.length +
    previousRoles.length;

  const timelineData = [

    ...activeRoles.map((role) => ({
      ...role,
      status: "active",
    })),

    ...previousRoles.map((role) => ({
      ...role,
      status: "completed",
    })),

  ];

  return (

    <View style={styles.container}>

      {/* Hero Summary */}

      <View style={styles.summaryCard}>

        <Text style={styles.summaryTitle}>
          Service Journey
        </Text>

        <View style={styles.summaryRow}>

          <View style={styles.summaryMetric}>
            <Text style={styles.metricValue}>
              {totalAppointments}
            </Text>
            <Text style={styles.metricLabel}>
              Total
            </Text>
          </View>

          <View style={styles.summaryMetric}>
            <Text style={styles.metricValue}>
              {activeRoles.length}
            </Text>
            <Text style={styles.metricLabel}>
              Active
            </Text>
          </View>

          <View style={styles.summaryMetric}>
            <Text style={styles.metricValue}>
              {previousRoles.length}
            </Text>
            <Text style={styles.metricLabel}>
              Completed
            </Text>
          </View>

        </View>

      </View>

      {/* Timeline */}

      {timelineData.length === 0 ? (

        <View style={styles.emptyCard}>

          <Text style={styles.emptyText}>
            No service history recorded.
          </Text>

        </View>

      ) : (

        timelineData.map((role, index) => (

          <View
            key={role.id}
            style={styles.timelineItem}
          >

            {/* Left Timeline */}

            <View style={styles.timelineLeft}>

              <View
                style={
                  role.status === "active"
                    ? styles.activeDot
                    : styles.pastDot
                }
              />

              {index !== timelineData.length - 1 && (
                <View style={styles.line} />
              )}

            </View>

            {/* Content */}

            <View style={styles.timelineCard}>

              <View style={styles.cardHeader}>

                <Text style={styles.roleTitle}>
                  {role.role}
                </Text>

                <View
                  style={
                    role.status === "active"
                      ? styles.activeBadge
                      : styles.completedBadge
                  }
                >

                  <Text
                    style={
                      role.status === "active"
                        ? styles.activeBadgeText
                        : styles.completedBadgeText
                    }
                  >
                    {role.status === "active"
                      ? "Active"
                      : "Completed"}
                  </Text>

                </View>

              </View>

              <Text style={styles.roleOrg}>
                {role.organization}
              </Text>

             <Text style={styles.roleMeta}>
  {role.status === "active"
    ? "Currently Serving"
    : role.duration ||
      "Past Service"}
</Text>

{role.historical && (
  <View style={styles.historicalBadge}>
    <Text
      style={styles.historicalBadgeText}
    >
      Historical Record
    </Text>
  </View>
)}

            </View>

          </View>

        ))

      )}

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    marginTop: 18,
  },

  summaryCard: {
    backgroundColor: "#4B3F72",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },

  summaryTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryMetric: {
    alignItems: "center",
    flex: 1,
  },

  metricValue: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
  },

  metricLabel: {
    marginTop: 4,
    color: "#D9D3EE",
    fontSize: 12,
  },

  timelineItem: {
    flexDirection: "row",
    marginBottom: 14,
  },

  timelineLeft: {
    width: 34,
    alignItems: "center",
  },

  activeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
  },

  pastDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#CBD5E1",
  },

  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },

  timelineCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  roleOrg: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },

  roleMeta: {
    marginTop: 8,
    color: "#9CA3AF",
    fontSize: 12,
  },

  activeBadge: {
    backgroundColor: "#ECFDF3",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  activeBadgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
  },

  completedBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  completedBadgeText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#9CA3AF",
  },
historicalBadge: {
  alignSelf: "flex-start",
  marginTop: 10,
  backgroundColor: "#FFF7E6",
  borderWidth: 1,
  borderColor: "#FFD591",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 20,
},

historicalBadgeText: {
  color: "#D48806",
  fontSize: 11,
  fontWeight: "700",
},
});