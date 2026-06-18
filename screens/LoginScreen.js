import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";

import { Feather, AntDesign } from "@expo/vector-icons";
import AppButton from "../components/AppButton";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginScreen({ navigation }) {

  useEffect(() => {
    const checkLogin = async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");

      if (isLoggedIn === "true") {
        navigation.replace("MainTabs");
      }
    };

    checkLogin();
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Enter email and password");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // ✅ FETCH USER
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    let userData;

    if (!userSnap.exists()) {
      // ✅ AUTO-CREATE USER
      userData = {
        email,
        role: "member",
        organizationId: "",
        entityId: "",
        entityName: "",
        name: "",
        phone: "",
        uid   // ✅ VERY IMPORTANT
      };

      await setDoc(userRef, userData);
      console.log("✅ New user profile created");

    } else {
      userData = { ...userSnap.data(), uid }; ✅ ensure uid is included
    }

    // ✅ SAVE LOGIN STATUS
    await AsyncStorage.setItem("isLoggedIn", "true");
    await AsyncStorage.setItem("currentUser", JSON.stringify(userData));

    // ✅ FORCE PROFILE COMPLETION
    if (!userData.name || !userData.phone) {
      navigation.replace("CompleteProfile");
      return;
    }

    // ✅ FORCE CHURCH SELECTION
    if (!userData.organizationId || !userData.entityId) {
      navigation.replace("CreateChurch");
      return;
    }

    // ✅ SAVE ACTIVE ENTITY
    await AsyncStorage.setItem(
      "activeEntity",
      JSON.stringify({
        organizationId: userData.organizationId,
        entityId: userData.entityId,
        name: userData.entityName || "Church"
      })
    );

    // ✅ ENTER APP
    navigation.replace("MainTabs");

  } catch (error) {
    console.log("LOGIN ERROR:", error.code);
    Alert.alert("Login Failed", error.message);
  }
};

      // ✅ CHECK IF USER HAS CHURCH
if (!userData.organizationId || !userData.entityId) {
  navigation.replace("CreateChurch");
  return;
}

// ✅ SAVE ACTIVE ENTITY
await AsyncStorage.setItem(
  "activeEntity",
  JSON.stringify({
    organizationId: userData.organizationId,
    entityId: userData.entityId,
    name: userData.entityName
  })
);

navigation.replace("MainTabs");

      navigation.replace("MainTabs");
} catch (error) {
  console.log("LOGIN ERROR:", error.code);   
  Alert.alert("Login Failed", error.message);
}

    
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Welcome Back</Text>

      <Text style={styles.subtitle}>
        Sign in to continue
      </Text>

      <TextInput
        placeholder="Email / Phone"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <View style={styles.passwordBox}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
          placeholderTextColor="#999"
        />

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Feather
            name={showPassword ? "eye" : "eye-off"}
            size={18}
            color="#555"
          />
        </TouchableOpacity>
      </View>

      <AppButton
        title="Login"
        onPress={handleLogin}
      />

      {/* ✅ DIVIDER */}
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.line} />
      </View>

      {/* ✅ GOOGLE */}
      <TouchableOpacity style={styles.socialBtn}>
        <AntDesign name="google" size={18} color="#DB4437" />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* ✅ PHONE */}
      <TouchableOpacity style={styles.socialBtn}>
        <Feather name="phone" size={18} color="#4B3F72" />
        <Text style={styles.socialText}>Continue with Phone</Text>
      </TouchableOpacity>

      {/* ✅ FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate("CreateChurch")}>
          <Text style={styles.register}>
            New Church? Register
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}


/* ✅ STYLES */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f7f8fb"
  },

  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 5,
    color: "#222"
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginBottom: 20
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },

  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 10,
    marginBottom: 12
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd"
  },

  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: "#888"
  },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },

  socialText: {
    marginLeft: 12,
    fontSize: 13,
    color: "#333"
  },

  footer: {
    marginTop: 30,
    alignItems: "center"
  },

  register: {
    color: "#4B3F72",
    fontWeight: "700",
    fontSize: 14
  }
});
