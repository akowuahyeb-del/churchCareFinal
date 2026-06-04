import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal
} from "react-native";

import { Linking } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useNavigation } from "@react-navigation/native";

export default function DonateScreen() {

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Mobile Money");
  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const navigation = useNavigation();
  const [historyList, setHistoryList] = useState([]);
``

  /* ✅ GENERATE RECEIPT */
  const generateReceipt = () => {
  if (!amount) return;

  const data = {
    id: "RCPT-" + Date.now(),
    amount,
    method,
    date: new Date().toLocaleString()
  };

  const updatedHistory = [data, ...historyList]; // ✅ important

  setHistoryList(updatedHistory); // ✅ store history
  setReceipt(data);
  setShowReceipt(true);
  setAmount("");

  // ✅ NOW THIS WORKS
  navigation.navigate("Finance", { donations: updatedHistory });
};


  /* ✅ SHARE WHATSAPP */
  const shareWhatsApp = () => {
    const msg =
      `Donation Receipt\n\n` +
      `ID: ${receipt.id}\nAmount: ₵${receipt.amount}\nMethod: ${receipt.method}\nDate: ${receipt.date}`;

    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => alert("WhatsApp not installed"));
  };

  /* ✅ SHARE EMAIL */
  const shareEmail = () => {
    const subject = "Donation Receipt";
    const body =
      `Receipt ID: ${receipt.id}\nAmount: ₵${receipt.amount}\nMethod: ${receipt.method}\nDate: ${receipt.date}`;

    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  /* ✅ GENERATE PDF */
  const generatePDF = async () => {
    if (!receipt) return;

    const html = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2>Church Donation Receipt</h2>
          <p><strong>ID:</strong> ${receipt.id}</p>
          <p><strong>Amount:</strong> ₵${receipt.amount}</p>
          <p><strong>Method:</strong> ${receipt.method}</p>
          <p><strong>Date:</strong> ${receipt.date}</p>
          <hr/>
          <p>Thank you for your donation.</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <View style={styles.container}>

      {/* ✅ HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Give</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.title}>Tithes & Offerings</Text>

        {/* ✅ AMOUNT */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.currency}>₵</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>

        {/* ✅ PAYMENT */}
        <Text style={styles.label}>Payment Method</Text>

        <TouchableOpacity style={styles.option} onPress={() => setMethod("Mobile Money")}>
          <View style={styles.radio}>{method === "Mobile Money" && <View style={styles.radioActive} />}</View>
          <Text>Mobile Money</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={() => setMethod("Card")}>
          <View style={styles.radio}>{method === "Card" && <View style={styles.radioActive} />}</View>
          <Text>Card</Text>
        </TouchableOpacity>

        {/* ✅ BUTTON */}
        <TouchableOpacity style={styles.button} onPress={generateReceipt}>
          <Text style={styles.buttonText}>Give Now</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ✅ RECEIPT MODAL */}
      <Modal visible={showReceipt} animationType="slide">
        <View style={styles.receiptContainer}>

          <Text style={styles.receiptTitle}>Donation Receipt</Text>

          <Text>ID: {receipt?.id}</Text>
          <Text>Amount: ₵{receipt?.amount}</Text>
          <Text>Method: {receipt?.method}</Text>
          <Text>Date: {receipt?.date}</Text>

          <TouchableOpacity style={styles.shareBtn} onPress={shareWhatsApp}>
            <Text style={styles.btnText}>Share WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emailBtn} onPress={shareEmail}>
            <Text style={styles.btnText}>Share Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pdfBtn} onPress={generatePDF}>
            <Text style={styles.btnText}>Download PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowReceipt(false)}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>

        </View>
      </Modal>

    </View>
  );
}

/* ✅ STYLES */
const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#f4f6fb" },

  header: {
    backgroundColor: "#4B3F72",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15
  },

  headerText: { color: "#fff", fontSize: 22, fontWeight: "700" },

  content: { padding: 15 },

  title: { fontSize: 20, fontWeight: "700", marginBottom: 20 },

  label: { marginBottom: 5, color: "#555" },

  inputWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 20
  },

  currency: { marginRight: 5 },

  input: { flex: 1 },

  option: { flexDirection: "row", marginBottom: 10 },

  radio: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center"
  },

  radioActive: {
    width: 8,
    height: 8,
    backgroundColor: "#4B3F72",
    borderRadius: 4
  },

  button: {
    backgroundColor: "#4B3F72",
    padding: 15,
    borderRadius: 10,
    alignItems: "center"
  },

  buttonText: { color: "#fff" },

  receiptContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },

  receiptTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20
  },

  shareBtn: { backgroundColor: "#25D366", padding: 12, marginTop: 10, borderRadius: 8, alignItems: "center" },
  emailBtn: { backgroundColor: "#0984E3", padding: 12, marginTop: 10, borderRadius: 8, alignItems: "center" },
  pdfBtn: { backgroundColor: "#6C5CE7", padding: 12, marginTop: 10, borderRadius: 8, alignItems: "center" },
  closeBtn: { backgroundColor: "#4B3F72", padding: 12, marginTop: 10, borderRadius: 8, alignItems: "center" },

  btnText: { color: "#fff" }

});