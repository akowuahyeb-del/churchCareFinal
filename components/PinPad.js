import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

export default function PinPad({
  pin,
  onDigit,
  onBackspace,
}) {
  return (
    <>
      <View style={styles.dotsRow}>
        {[0,1,2,3,4,5].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length &&
                styles.dotFilled,
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {KEYPAD.map((row, ri) => (
          <View
            key={ri}
            style={styles.keypadRow}
          >
            {row.map((key, ki) => {

              if (key === "") {
                return (
                  <View
                    key={ki}
                    style={styles.key}
                  />
                );
              }

              if (key === "back") {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={styles.key}
                    onPress={onBackspace}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={26}
                      color="#4B3F72"
                    />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={ki}
                  style={styles.key}
                  onPress={() =>
                    onDigit(key)
                  }
                >
                  <Text
                    style={styles.keyText}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },

  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4B3F72",
    marginHorizontal: 7,
  },

  dotFilled: {
    backgroundColor: "#4B3F72",
  },

  keypad: {
    marginTop: 10,
  },

  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 6,
  },

  key: {
    width: 76,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f6fb",
  },

  keyText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#222",
  },
});