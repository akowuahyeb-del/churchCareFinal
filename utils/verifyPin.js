import AsyncStorage from "@react-native-async-storage/async-storage";
import { hashPin } from "./pinHash";

export const verifyPin = async (enteredPin) => {
  const storedHash =
    await AsyncStorage.getItem("pinHash");

  if (!storedHash) return false;

  const enteredHash =
    await hashPin(enteredPin);

  return enteredHash === storedHash;
};