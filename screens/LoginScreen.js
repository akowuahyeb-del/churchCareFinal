import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from "react-native";

export default function LoginScreen({ navigation }) {

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Login Screen</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.replace("Home")}
      >
        <Text style={{ color: "#fff" }}>
          Continue to App
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 20,
    marginBottom: 20
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 6
  }

});