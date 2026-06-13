import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from "react-native";

export default function FlyerUploadModal({
  visible,
  onClose,
  onUpload
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">

      <View style={styles.overlay}>
        <View style={styles.box}>

          <Text style={styles.title}>Upload Flyer</Text>

          <TouchableOpacity style={styles.btn} onPress={onUpload}>
            <Text style={styles.btnText}>Choose Image</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  },

  box: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 16,
    padding: 20
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10
  },

  btn: {
    backgroundColor: "#4B3F72",
    padding: 12,
    borderRadius: 10,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "700"
  },

  cancel: {
    textAlign: "center",
    marginTop: 10,
    color: "#888"
  }
});