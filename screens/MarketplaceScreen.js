import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { db } from "../firebase";
const formatRewardType = (type) => {
  switch (type) {

    case "discount_percent":
      return "Subscription Discount";

    case "free_months":
      return "Free Subscription Month";

    case "extra_members":
      return "Extra Member Capacity";

    case "extra_admins":
      return "Extra Admin Capacity";

    case "feature_unlock":
      return "Feature Unlock";

    default:
      return type || "Reward";
  }
};

export default function MarketplaceScreen({

  route,
  navigation,
}) {
  const {
    organizationId,
    entityId,
    memberId,
  } = route.params;

  const [loading, setLoading] =
    useState(true);

  const [member, setMember] =
    useState(null);

  const [items, setItems] =
    useState([]);

  const [history, setHistory] =
    useState([]);

  const functions =
    getFunctions();

  const redeemMarketplaceItem =
    httpsCallable(
      functions,
      "redeemMarketplaceItem"
    );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const memberSnap =
        await getDoc(
          doc(
            db,
            "organizations",
            organizationId,
            "entities",
            entityId,
            "members",
            memberId
          )
        );

      if (memberSnap.exists()) {
        setMember({
          id: memberSnap.id,
          ...memberSnap.data(),
        });
      }

      const itemSnap =
        await getDocs(
          collection(
            db,
            "marketplaceItems"
          )
        );

      const marketplaceItems =
        itemSnap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
          }))
          .filter(
            item => item.active
          );

      setItems(
        marketplaceItems
      );

      const historySnap =
        await getDocs(
          query(
            collection(
              db,
              "organizations",
              organizationId,
              "entities",
              entityId,
              "members",
              memberId,
              "rewardLedger"
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          )
        );

      setHistory(
        historySnap.docs.map(
          d => ({
            id: d.id,
            ...d.data(),
          })
        )
      );
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const redeemItem = async item => {
    try {
      Alert.alert(
        "Redeem Reward",
        `Redeem ${item.name} for ${item.tokenCost} points?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Redeem",
            onPress: async () => {
              try {
                await redeemMarketplaceItem({
                  organizationId,
                  entityId,
                  memberId,
                  itemId: item.id,
                });

                Alert.alert(
                  "Success",
                  "Reward redeemed successfully."
                );

                loadData();
              } catch (e) {
                Alert.alert(
                  "Error",
                  e.message
                );
              }
            },
          },
        ]
      );
    } catch (e) {
      console.log(e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color="#4B3F72"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
    >
      <View style={styles.balanceCard}>
        <Text
          style={styles.balanceLabel}
        >
          Available Points
        </Text>

        <Text
          style={styles.balanceValue}
        >
          {member?.rewardPoints || 0}
        </Text>
      </View>

      <Text style={styles.title}>
        Marketplace Rewards
      </Text>

      {items.map(item => (
        <View
          key={item.id}
          style={styles.card}
        >
          <Text
            style={styles.itemName}
          >
            {item.name}
          </Text>

         <Text style={styles.itemCost}>
  Cost: {item.tokenCost} points
</Text>

{item.fulfillment && (
  <View
    style={{
      backgroundColor: "#312E81",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: "flex-start",
      marginTop: 8,
    }}
  >
    <Text
      style={{
        color: "#C7D2FE",
        fontWeight: "700",
        fontSize: 12,
      }}
    >
      {formatRewardType(
        item.fulfillment.entitlementType
      )}
      {" • "}
      {item.fulfillment.value}
    </Text>
  </View>
)}
{item.stock !== null && (
  <Text
    style={{
      color: "#999",
      marginTop: 4,
    }}
  >
    Remaining: {item.stock}
  </Text>
)}

         <TouchableOpacity
  disabled={
    (member?.rewardPoints || 0) <
    item.tokenCost
  }
  style={[
    styles.redeemBtn,

    (member?.rewardPoints || 0) <
      item.tokenCost && {
      backgroundColor: "#555",
    },
  ]}

            onPress={() =>
              redeemItem(item)
            }
          >
           <Text style={styles.btnText}>
  {(member?.rewardPoints || 0) <
  item.tokenCost
    ? "Not Enough Points"
    : "Redeem"}
</Text>

          </TouchableOpacity>
        </View>
      ))}

      <Text
        style={[
          styles.title,
          { marginTop: 25 },
        ]}
      >
        Reward History
      </Text>

      {history.map(entry => (
        <View
          key={entry.id}
          style={styles.historyCard}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={
                entry.amount > 0
                  ? "add-circle"
                  : "remove-circle"
              }
              size={20}
              color={
                entry.amount > 0
                  ? "#27ae60"
                  : "#e74c3c"
              }
            />

            <Text
              style={
                styles.historyAmount
              }
            >
              {entry.amount}
            </Text>
          </View>

         <Text style={styles.historyReason}>
  {entry.itemName ||
    entry.reason ||
    entry.rewardType ||
    "Reward Activity"}
</Text>
{entry.redemptionStatus && (
  <Text
    style={{
      color:
        entry.redemptionStatus === "approved"
          ? "#27ae60"
          : entry.redemptionStatus === "pending"
          ? "#F39C12"
          : "#aaa",
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
    }}
  >
    {entry.redemptionStatus.toUpperCase()}
  </Text>
)}

        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 16,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },

  balanceCard: {
    backgroundColor: "#4B3F72",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },

  balanceLabel: {
    color: "#ccc",
    fontSize: 14,
  },

  balanceValue: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 8,
  },

  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },

  itemName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  itemCost: {
    color: "#aaa",
    marginTop: 6,
  },

  redeemBtn: {
    backgroundColor: "#4B3F72",
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },

  historyCard: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  historyAmount: {
    color: "#fff",
    marginLeft: 10,
    fontWeight: "700",
  },

  historyReason: {
    color: "#aaa",
    marginTop: 5,
  },
});