import React, {
  useState,
  useEffect,
} from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";


import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

import AsyncStorage from "@react-native-async-storage/async-storage";

import AppHeader from "../components/AppHeader";
import { db } from "../firebase";

const formatDate = (dateString) => {

  if (!dateString) return "-";

  const d = new Date(dateString);

  const day = String(
    d.getDate()
  ).padStart(2, "0");

  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const year =
    d.getFullYear();

  return `${day}/${month}/${year}`;
};

export default function VisitorRegisterScreen({
  navigation,
}) {

  const [visitors, setVisitors] =
    useState([]);

    const [activeFilter, setActiveFilter] =
  useState("all");

  const [showMoreFilters,
  setShowMoreFilters] =
    useState(false);

  const [selectedIds, setSelectedIds] =
  useState([]);
  const [searchText, setSearchText] =
  useState("");

  useEffect(() => {
  const unsubscribe = navigation.addListener(
    "focus",
    () => {
      loadVisitors();
    }
  );

  return unsubscribe;
}, [navigation]);

  const loadVisitors = async () => {

    try {

      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (!stored) return;

      const {
        organizationId,
        entityId,
      } = JSON.parse(stored);

      const snap = await getDocs(
        collection(
          db,
          "organizations",
          organizationId,
          "entities",
          entityId,
          "visitors"
        )
      );

      const data =
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setVisitors(data);


    } catch (e) {

      console.log(
        "❌ LOAD VISITOR REGISTER",
        e
      );
    }
  };

const filteredVisitors =
  visitors.filter((v) => {

    const search =
      searchText.toLowerCase();

    const matchesSearch =

      (v.name || "")
        .toLowerCase()
        .includes(search)

      ||

      (v.phone || "")
        .toLowerCase()
        .includes(search)

      ||

      (v.suburb || "")
        .toLowerCase()
        .includes(search);

    if (!matchesSearch) {
      return false;
    }

    switch (activeFilter) {

      case "all":
        return true;

      case "active":
        return !v.convertedToMember;

      case "converted":
        return !!v.convertedToMember;

      case "assigned":
        return !!v.assignment;

      case "unassigned":
        return !v.assignment;

      case "new":
      case "contacted":
      case "visited":
      case "interested":
      case "membership_class":

        return (
          v.followUpStatus ===
          activeFilter
        );

      default:
        return true;
    }

  });

const toggleVisitor = (id) => {

  setSelectedIds((prev) =>

    prev.includes(id)
      ? prev.filter(
          x => x !== id
        )
      : [...prev, id]
  );
};


const bulkUpdateStatus = async (
  newStatus
) => {

  if (selectedIds.length === 0) {

    Alert.alert(
      "No Visitors Selected",
      "Select one or more visitors first."
    );

    return;
  }

  Alert.alert(
    "Confirm Bulk Update",
    `Update ${selectedIds.length} visitor(s) to "${newStatus}"?`,

    [
      {
        text: "Cancel",
        style: "cancel",
      },

      {
        text: "Update",

        onPress: async () => {

          try {

            const stored =
              await AsyncStorage.getItem(
                "activeEntity"
              );

            if (!stored) return;

            const {
              organizationId,
              entityId,
            } = JSON.parse(stored);

            const updates =
              selectedIds.map((id) =>

                updateDoc(
                  doc(
                    db,
                    "organizations",
                    organizationId,
                    "entities",
                    entityId,
                    "visitors",
                    id
                  ),
                  {
                    followUpStatus:
                      newStatus,

                    updatedAt:
                      new Date()
                        .toISOString(),
                  }
                )
              );

            await Promise.all(
              updates
            );

            await loadVisitors();

            const count =
              selectedIds.length;

            setSelectedIds([]);

            Alert.alert(
              "Success",
              `${count} visitor(s) updated.`
            );

          } catch (e) {

            console.log(
              "❌ BULK UPDATE ERROR",
              e
            );

            Alert.alert(
              "Update Failed",
              e.message
            );
          }

        },
      },
    ]
  );
};
  return (
    <View style={{ flex: 1 }}>

      <AppHeader
        title="Visitor Register"
        subtitle="All visitors"
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >
 <TextInput
  placeholder="Search name, phone or area..."
  value={searchText}
  onChangeText={setSearchText}
  style={styles.searchInput}
/>

<View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  }}
>
  <Text
    style={{
      fontWeight: "700",
      color: "#555",
    }}
  >
    Filters
  </Text>

  <Text
    style={{
      color: "#777",
      fontSize: 12,
    }}
  >
    Showing {filteredVisitors.length} • {activeFilter}
  </Text>
</View>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={true}
  contentContainerStyle={{
    paddingBottom: 16,
    paddingRight: 20,
  }}
>


  {[
  "all",
  "assigned",
  "unassigned",
  "active",
  "more",
].map((filter) => (

    <TouchableOpacity
      key={filter}
      onPress={() => {

  if (filter === "more") {

    setShowMoreFilters(
      !showMoreFilters
    );

    return;
  }

  setActiveFilter(filter);

}}
     style={[
  styles.filterChip,
  activeFilter === filter &&
    styles.filterChipActive,
]}

    >
      <Text
     style={
  activeFilter === filter
    ? styles.filterTextActive
    : styles.filterText
}
      >
        {filter === "more"
  ? "MORE"
  : filter
      .replace("_", " ")
      .toUpperCase()}
      </Text>
    </TouchableOpacity>

  ))}

</ScrollView>




{showMoreFilters && (

  <View
    style={{
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    }}
  >

    <Text
      style={{
        fontWeight: "700",
        marginBottom: 10,
      }}
    >
      More Filters
    </Text>

    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >

      {[
        "all",
        "new",
        "contacted",
        "visited",
        "interested",
        "membership_class",
        "converted",
      ].map((status) => (

        <TouchableOpacity
          key={status}
          onPress={() => {

  setActiveFilter(status);

  if (status === "all") {
  setActiveFilter("all");
} else {
  setActiveFilter(status);
}

setShowMoreFilters(false);


}}
style={[
  styles.filterChip,
  activeFilter === status &&
    styles.filterChipActive,
]}
        >
          <Text
        style={
  activeFilter === status
    ? styles.filterTextActive
    : styles.filterText
}

          >
            {status.toUpperCase()}
          </Text>
        </TouchableOpacity>

      ))}

    </View>

  </View>

)}

<View
  style={{
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>


  

    <TouchableOpacity
      onPress={() => {

        if (
          selectedIds.length ===
          filteredVisitors.length
        ) {

          setSelectedIds([]);

        } else {

          setSelectedIds(
            filteredVisitors.map(
              v => v.id
            )
          );

        }

      }}
    >
      <Text
        style={{
          color: "#4B3F72",
          fontWeight: "700",
        }}
      >
        {selectedIds.length ===
        filteredVisitors.length
          ? "Deselect All"
          : "Select All"}
      </Text>
    </TouchableOpacity>

    <Text
      style={{
        fontWeight: "700",
      }}
    >
      {selectedIds.length} Selected
    </Text>

  </View>


{selectedIds.length > 0 && (

  <View
    style={{
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    }}
  >

    <TouchableOpacity
  style={styles.bulkBtn}
  onPress={() =>
    bulkUpdateStatus(
      "contacted"
    )
  }
>
  <Text style={styles.bulkBtnText}>
    Contacted
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.bulkBtn}
  onPress={() =>
    bulkUpdateStatus(
      "visited"
    )
  }
>
  <Text style={styles.bulkBtnText}>
    Visited
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.bulkBtn}
  onPress={() =>
    bulkUpdateStatus(
      "interested"
    )
  }
>
  <Text style={styles.bulkBtnText}>
    Interested
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={[
    styles.bulkBtn,
    {
      backgroundColor: "#22C55E",
    },
  ]}
  onPress={() =>
    Alert.alert(
      "Coming Soon",
      "Bulk conversion will be implemented after bulk status updates are fully tested."
    )
  }
>
  <Text style={styles.bulkBtnText}>
    Convert
  </Text>
</TouchableOpacity>

  </View>

)}


        {/* Table Header */}
{/* <View style={styles.headerRow}>

  <Text
    style={[
      styles.headerCell,
      { width: 40 }
    ]}
  >
    ✓
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Name
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Phone
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Area
  </Text>

  <Text style={[styles.headerCell,{ flex: 2 }]}>
    Date
  </Text>

  <Text style={[styles.headerCell,{ flex: 1 }]}>
    Status
  </Text>

</View> */}

      

{filteredVisitors.map((item) => (

  <TouchableOpacity
    key={item.id}
    style={styles.visitorCard}
    onPress={() =>
      navigation.navigate(
        "VisitorProfile",
        {
          visitor: item,
        }
      )
    }
  >

    {/* Top Row */}

    <View style={styles.topRow}>

      <TouchableOpacity
        onPress={() =>
          toggleVisitor(item.id)
        }
      >
        <View
  style={[
    styles.selectCircle,
    selectedIds.includes(item.id) &&
      styles.selectCircleActive,
  ]}
>
  {selectedIds.includes(item.id) && (
    <Text style={styles.selectTick}>
      ✓
    </Text>
  )}
</View>
      </TouchableOpacity>

      <Text
        style={styles.visitorName}
        numberOfLines={1}
      >
        {item.name}
      </Text>

      <View
        style={[
          styles.statusBadge,

          item.followUpStatus === "new" &&
            styles.statusNew,

          item.followUpStatus === "contacted" &&
            styles.statusContacted,

          item.followUpStatus === "visited" &&
            styles.statusVisited,

          item.followUpStatus === "interested" &&
            styles.statusInterested,

          item.followUpStatus === "converted" &&
            styles.statusConverted,
        ]}
      >
        <Text style={styles.statusText}>
          {item.followUpStatus || "new"}
        </Text>
      </View>

    </View>

    {/* Phone */}

    <Text style={styles.visitorPhone}>
      {item.phone || "-"}
    </Text>

    {/* Area + Date */}

   <Text style={styles.visitorMeta}>
  {(item.suburb || "No Area")}
  {" • "}
  {(item.firstVisitDate || "-")}
</Text>

<Text style={styles.visitorMeta}>
  Follow-Ups:
  {" "}
  {item.followUpCount || 0}
</Text>

<Text style={styles.visitorMeta}>
  Last Follow-Up:
  {" "}
  {item.lastFollowUpDate
    ? formatDate(item.lastFollowUpDate)
    : "Never"}
</Text>

{item.assignment && (

  <Text style={styles.assignmentText}>

    Assigned:
    {" "}
    {item.assignment.name}

    {" • "}

    {item.assignment.type}

  </Text>

)}


  </TouchableOpacity>

))}


      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 8,
  },

  headerCell: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  cell: {
    fontSize: 12,
    color: "#333",
  },
statusBadge: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: "flex-start",
},

statusText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
  textTransform: "capitalize",
},

statusNew: {
  backgroundColor: "#3B82F6",
},

statusContacted: {
  backgroundColor: "#F59E0B",
},

statusInterested: {
  backgroundColor: "#10B981",
},

statusConverted: {
  backgroundColor: "#8B5CF6",
},
statusVisited: {
  backgroundColor: "#f80b3b",
},
filterWrap: {
  flexDirection: "row",
},

filterChip: {
  backgroundColor: "#EDEDED",
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 6,
},

filterChipActive: {
  backgroundColor: "#4B3F72",
},

filterText: {
  color: "#555",
  fontSize: 12,
  fontWeight: "600",
},

filterTextActive: {
  color: "#fff",
  fontSize: 12,
  fontWeight: "700",
},
visitorCard: {
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
  elevation: 2,
},

topRow: {
  flexDirection: "row",
  alignItems: "center",
},

checkbox: {
  fontSize: 20,
  marginRight: 10,
  color: "#4B3F72",
},

visitorName: {
  flex: 1,
  fontSize: 16,
  fontWeight: "700",
  color: "#222",
},

visitorPhone: {
  marginTop: 8,
  marginLeft: 30,
  color: "#555",
},

visitorMeta: {
  marginTop: 4,
  marginLeft: 30,
  color: "#888",
  fontSize: 12,
},
searchInput: {
  backgroundColor: "#fff",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  fontSize: 14,
},
bulkBtn: {
  backgroundColor: "#4B3F72",
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 20,
},

bulkBtnText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 12,
},

selectCircle: {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: "#4B3F72",
  marginRight: 12,
  justifyContent: "center",
  alignItems: "center",
},

selectCircleActive: {
  backgroundColor: "#4B3F72",
},

selectTick: {
  color: "#fff",
  fontWeight: "700",
},
assignmentText: {
  marginTop: 4,
  marginLeft: 30,
  fontSize: 12,
  fontWeight: "600",
  color: "#4B3F72",
},
});