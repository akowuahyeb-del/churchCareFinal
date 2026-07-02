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
        
       
<View style={styles.card}>

  <Text style={styles.cardTitle}>
    Location-Based Attendance
  </Text>

  <Text style={styles.description}>
    Allow members to check in only when they are within the approved church attendance area.
  </Text>

  <View style={styles.settingRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.settingLabel}>
        Location-Based Attendance
      </Text>

      <Text style={styles.settingSub}>
        Verify member location before attendance is recorded
      </Text>
    </View>

    <Switch
      value={geoEnabled}
      onValueChange={setGeoEnabled}
    />
  </View>

  <Text style={styles.inputLabel}>
    Check-In Radius (metres)
  </Text>

  <TextInput
    style={styles.input}
    keyboardType="numeric"
    value={checkInRadius}
    onChangeText={setCheckInRadius}
    placeholder="150"
  />

  <Text style={styles.helperText}>
    Recommended: 100–200 metres
  </Text>

</View>

<View style={styles.card}>

  <Text style={styles.cardTitle}>
    Church Attendance Location
  </Text>

  <Text style={styles.description}>
    Set the church location used for attendance verification.
  </Text>

  <Text style={styles.inputLabel}>
    Latitude
  </Text>

  <TextInput
    style={styles.input}
    value={latitude}
    onChangeText={setLatitude}
    keyboardType="numeric"
    placeholder="e.g. 6.6885"
  />

  <Text style={styles.inputLabel}>
    Longitude
  </Text>

  <TextInput
    style={styles.input}
    value={longitude}
    onChangeText={setLongitude}
    keyboardType="numeric"
    placeholder="e.g. -1.6244"
  />

  <TouchableOpacity
    style={styles.locationButton}
   onPress={useCurrentLocation}
  >
    <Text style={styles.locationButtonText}>
      Use Current Location
    </Text>
  </TouchableOpacity>

</View>


       

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
});