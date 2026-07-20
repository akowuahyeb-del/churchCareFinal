// utils/pinHash.js
import * as Crypto from "expo-crypto";

const SALT = "churchcare_pin_v1_salt";

export async function hashPin(pin) {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${SALT}:${pin}`
  );
  return digest;
}