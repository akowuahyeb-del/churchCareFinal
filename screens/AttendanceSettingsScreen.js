import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
} from "react-native";
import AppHeader from "../components/AppHeader";

export default function AttendanceSettingsScreen({ navigation }) {

const [geoEnabled, setGeoEnabled] = useState(true);
const [checkInRadius, setCheckInRadius] = useState("150");


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
});