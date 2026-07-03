import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import AppHeader from "../components/AppHeader";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

export default function AttendanceSettingsScreen({ navigation }) {

const [geoEnabled, setGeoEnabled] = useState(true);
const [checkInRadius, setCheckInRadius] = useState("150");
const [latitude, setLatitude] = useState("");
const [longitude, setLongitude] = useState("");


const useCurrentLocation = async () => {
  try {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Location access is required."
      );
      return;
    }

    const location =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

    setLatitude(
      location.coords.latitude.toString()
    );

    setLongitude(
      location.coords.longitude.toString()
    );

    Alert.alert(
      "Location Captured",
      "Church location updated successfully."
    );

  } catch (e) {
    console.log("LOCATION ERROR:", e);

    Alert.alert(
      "Error",
      "Unable to retrieve current location."
    );
  }
};



  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance Settings"
        subtitle="Configure attendance rules"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        
<ScrollView
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 40,
  }}
>

  {/* LOCATION SETTINGS */}

  <View style={styles.fintechCard}>

    <View style={styles.fintechHeader}>
      <View style={styles.iconBubble}>
        <Ionicons
          name="location-outline"
          size={22}
          color="#4B3F72"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.fintechTitle}>
          Location-Based Attendance
        </Text>

        <Text style={styles.fintechDescription}>
          Verify member location before attendance is recorded.
        </Text>
      </View>
    </View>

    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>
          Enable Verification
        </Text>

        <Text style={styles.settingSub}>
          Members must be within the church area.
        </Text>
      </View>

      <Switch
        value={geoEnabled}
        onValueChange={setGeoEnabled}
      />
    </View>

    <Text style={styles.fieldTitle}>
      Check-In Radius
    </Text>

    <View style={styles.fintechInput}>
      <TextInput
        style={styles.fintechInputText}
        value={checkInRadius}
        onChangeText={setCheckInRadius}
        keyboardType="numeric"
        placeholder="150"
      />
    </View>

    <Text style={styles.helperText}>
      Recommended: 100–200 metres
    </Text>

  </View>

  {/* CHURCH LOCATION */}

  <View style={styles.fintechCard}>

    <View style={styles.fintechHeader}>
      <View style={styles.iconBubble}>
        <Ionicons
          name="pin-outline"
          size={22}
          color="#4B3F72"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.fintechTitle}>
          Church Attendance Location
        </Text>

        <Text style={styles.fintechDescription}>
          Used to validate geo-based attendance.
        </Text>
      </View>
    </View>

    <Text style={styles.fieldTitle}>
      Latitude
    </Text>

    <View style={styles.fintechInput}>
      <TextInput
        style={styles.fintechInputText}
        value={latitude}
        onChangeText={setLatitude}
        placeholder="6.6885"
      />
    </View>

    <Text style={styles.fieldTitle}>
      Longitude
    </Text>

    <View style={styles.fintechInput}>
      <TextInput
        style={styles.fintechInputText}
        value={longitude}
        onChangeText={setLongitude}
        placeholder="-1.6244"
      />
    </View>

    <TouchableOpacity
      style={styles.locationAction}
      onPress={useCurrentLocation}
    >
      <Ionicons
        name="locate"
        size={18}
        color="#4B3F72"
      />

      <Text style={styles.locationActionText}>
        Use Current Location
      </Text>
    </TouchableOpacity>

  </View>

  {/* LOCATION PREVIEW */}

  {(latitude && longitude) && (
    <View style={styles.previewCard}>
      <Text style={styles.previewLabel}>
        CURRENT LOCATION
      </Text>

      <Text style={styles.previewValue}>
        📍 Latitude: {latitude}
      </Text>

      <Text style={styles.previewValue}>
        📍 Longitude: {longitude}
      </Text>
    </View>
  )}

  {/* SAVE */}

  <TouchableOpacity
    style={styles.primarySaveButton}
  >
    <Ionicons
      name="save-outline"
      size={18}
      color="#fff"
    />

    <Text style={styles.primarySaveText}>
      Save Changes
    </Text>
  </TouchableOpacity>

</ScrollView>
       

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  content: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  locationButton: {
  marginTop: 16,
  backgroundColor: "#27AE60",
  padding: 14,
  borderRadius: 10,
  alignItems: "center",
},

locationButtonText: {
  color: "#fff",
  fontWeight: "700",
},
saveButton: {
  backgroundColor: "#4B3F72",
  borderRadius: 12,
  padding: 16,
  marginTop: 20,
  marginBottom: 30,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
},

saveButtonText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},
fintechCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 18,
  marginBottom: 16,
},

fintechHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 18,
},

iconBubble: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#EEF0FA",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
},

fintechTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#222",
},

fintechDescription: {
  fontSize: 13,
  color: "#777",
  marginTop: 4,
},

fieldTitle: {
  fontSize: 12,
  fontWeight: "700",
  color: "#777",
  marginTop: 14,
  marginBottom: 6,
  textTransform: "uppercase",
},

fintechInput: {
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
},

fintechInputText: {
  fontSize: 15,
  color: "#222",
  fontWeight: "600",
},

locationAction: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,

  marginTop: 18,

  paddingVertical: 14,

  backgroundColor: "#EEF0FA",

  borderRadius: 14,
},

locationActionText: {
  color: "#4B3F72",
  fontWeight: "700",
  fontSize: 14,
},

previewCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 18,
  marginBottom: 16,
},

previewLabel: {
  fontSize: 11,
  color: "#999",
  fontWeight: "800",
  marginBottom: 8,
},

previewValue: {
  fontSize: 14,
  color: "#222",
  marginBottom: 4,
},

primarySaveButton: {
  backgroundColor: "#4B3F72",

  height: 58,

  borderRadius: 16,

  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",

  gap: 8,
},

primarySaveText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "800",
},

helperText: {
  marginTop: 8,
  color: "#888",
  fontSize: 12,
},
settingRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  marginTop: 20,   // add this
  paddingTop: 12,
},
fintechInputText: {
  fontSize: 18,
  fontWeight: "700",
  color: "#374151",
}

});