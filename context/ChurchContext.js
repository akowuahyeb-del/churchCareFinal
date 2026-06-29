import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const ChurchContext = createContext();

export const ChurchProvider = ({ children }) => {
  const [churchId, setChurchId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIX 1: MISSING STATE
  const [role, setRole] = useState(null);

  // ✅ FIX 2: MISSING STATE
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadChurchId();
    loadUserData();
  }, []);

  const loadChurchId = async () => {
    try {
      const savedId = await AsyncStorage.getItem("churchId");

      if (savedId) {
        setChurchId(savedId);
        console.log("✅ churchId loaded:", savedId);
      } else {
        const defaultId = "church_001";
        setChurchId(defaultId);
        await AsyncStorage.setItem("churchId", defaultId);
        console.log("⚠️ default churchId set:", defaultId);
      }
    } catch (error) {
      console.log("Error loading churchId:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeChurch = async (newId) => {
    try {
      await AsyncStorage.setItem("churchId", newId);
      setChurchId(newId);
      console.log("✅ church switched to:", newId);
    } catch (error) {
      console.log("Error switching church:", error);
    }
  };

  const loadUserData = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log("⚠️ No logged-in user");

        // ✅ fallback
        setRole("member");
        return;
      }

      setUser(currentUser);

      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setRole(data.role || "member"); // ✅ safe fallback
        console.log("✅ role loaded:", data.role);

        if (data.churchId) {
          setChurchId(data.churchId);
        }
      } else {
        setRole("member"); // ✅ fallback if no doc
      }
    } catch (error) {
      console.log("Error loading user data:", error);
      setRole("member"); // ✅ fallback on error
    }
  };

  return (
    <ChurchContext.Provider
      value={{
        churchId,
        changeChurch,
        loading,
        role,
        user,
      }}
    >
      {children}
    </ChurchContext.Provider>
  );
};

export const useChurch = () => {
  const context = useContext(ChurchContext);

  if (!context) {
    throw new Error("useChurch must be used within ChurchProvider");
  }

  return context;
};