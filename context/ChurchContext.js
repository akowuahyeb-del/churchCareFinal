import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ChurchContext = createContext();

export const ChurchProvider = ({ children }) => {
  const [churchId, setChurchId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChurchId();
  }, []);

  const loadChurchId = async () => {
    try {
      const savedId = await AsyncStorage.getItem("churchId");

      if (savedId) {
        setChurchId(savedId);
        console.log("✅ churchId loaded:", savedId);
      } else {
        // ✅ default fallback (for testing)
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

  return (
    <ChurchContext.Provider value={{ churchId, changeChurch, loading }}>
      {children}
    </ChurchContext.Provider>
  );
};

export const useChurch = () => useContext(ChurchContext);
