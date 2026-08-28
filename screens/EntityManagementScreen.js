import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

import AppHeader from "../components/AppHeader";

export default function EntityManagementScreen({
  navigation,
}) {

  const cards = [
    {
      title: "Ministries",
      subtitle: "Leadership & Positions",
      color: "#4B3F72",
      route: "MinistryLeadership",
    },

    {
  title: "Committees",
  subtitle: "Committee Management",
  color: "#1BA97F",
  route: "Committee",
},

   {
  title: "Offices",
  subtitle: "Church Office Holders",
  color: "#D4A62A",
  route: "Office",
},

    {
      title: "Governance",
      subtitle: "Session & Boards",
      color: "#D35400",
      route: "GovernanceBody",
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Organization Structures"
        subtitle="Leadership & Governance"
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >
        <View style={styles.grid}>

          {cards.map((card) => (

            <TouchableOpacity
              key={card.title}
              style={styles.card}
              onPress={() =>
                navigation.navigate(
                  card.route
                )
              }
            >

              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      card.color,
                  },
                ]}
              />

              <Text style={styles.title}>
                {card.title}
              </Text>

              <Text
                style={styles.subtitle}
              >
                {card.subtitle}
              </Text>

            </TouchableOpacity>

          ))}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent:
      "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: "#F2F4F7",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 3,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
  },

  subtitle: {
    marginTop: 8,
    color: "#666",
    fontSize: 13,
  },

});
