import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function ChurchSelectScreen() {
  const navigation = useNavigation();

  // ✅ THIS IS WHERE IT GOES
  const selectChurch = async (id) => {
    await AsyncStorage.setItem("churchId", id);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Church</Text>

      <TouchableOpacity style={styles.item} onPress={() => selectChurch("main")}>
        <Text>Main Branch</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => selectChurch("kumasi")}>
        <Text>Kumasi Branch</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => selectChurch("eastlegon")}>
        <Text>East Legon Branch</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => selectChurch("campus")}>
        <Text>Campus Church</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center"
  },
  item: {
    padding: 15,
    backgroundColor: "#eee",
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center"
  }
});
