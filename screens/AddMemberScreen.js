import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native";

export default function AddMemberScreen({ navigation, route }) {

  const { memberData, editingId } = route.params || {};

  const [member, setMember] = useState(
    memberData || {
      name: "",
      phone: "",
      address: "",
      occupation: "",
      emergencyContact: "",
      membershipDuration: "",
      ministry: "",
      baptismStatus: "",
      status: "",
      communicant: "",
      communicantStatus: "active"
    }
  );

  const handleSaveMember = () => {
    console.log("Saving member:", member);
    navigation.goBack();
  };

  const handleCommunicantSelect = (val) => {
    setMember({ ...member, communicant: val });
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        {editingId ? "Edit Member" : "Register Member"}
      </Text>

      {/* ✅ INPUTS */}

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={member.name}
        onChangeText={(t) => setMember({ ...member, name: t })}
      />

      <Text style={styles.label}>Phone *</Text>
      <TextInput
        style={styles.input}
        value={member.phone}
        onChangeText={(t) => setMember({ ...member, phone: t })}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={member.address}
        onChangeText={(t) => setMember({ ...member, address: t })}
      />

      <Text style={styles.label}>Occupation</Text>
      <TextInput
        style={styles.input}
        value={member.occupation}
        onChangeText={(t) => setMember({ ...member, occupation: t })}
      />

      <Text style={styles.label}>Emergency Contact</Text>
      <TextInput
        style={styles.input}
        value={member.emergencyContact}
        onChangeText={(t) =>
          setMember({ ...member, emergencyContact: t })
        }
      />

      <Text style={styles.label}>Membership Duration</Text>
      <TextInput
        style={styles.input}
        value={member.membershipDuration}
        onChangeText={(t) =>
          setMember({ ...member, membershipDuration: t })
        }
      />

      {/* ✅ COMMUNICANT */}

      <Text style={styles.label}>Communicant *</Text>

      <View style={styles.row}>
        {["yes", "no"].map((val) => (
          <TouchableOpacity
            key={val}
            onPress={() => handleCommunicantSelect(val)}
            style={[
              styles.communicantBtn,
              member.communicant === val && styles.activeBtn,
            ]}
          >
            <Text
              style={[
                styles.btnText,
                member.communicant === val && { color: "#fff" },
              ]}
            >
              {val.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ✅ BUTTONS */}

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSaveMember}
      >
        <Text style={styles.saveText}>Save Member</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f4f6fb"
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#222"
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    color: "#444"
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },

  row: {
    flexDirection: "row",
    marginTop: 8
  },

  communicantBtn: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    backgroundColor: "#eee",
    borderRadius: 8,
    alignItems: "center"
  },

  activeBtn: {
    backgroundColor: "#4B3F72"
  },

  btnText: {
    color: "#333",
    fontWeight: "600"
  },

  saveBtn: {
    backgroundColor: "#4B3F72",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center"
  },

  saveText: {
    color: "#fff",
    fontWeight: "700"
  },

  cancelBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center"
  },

  cancelText: {
    color: "#333",
    fontWeight: "600"
  }
});
