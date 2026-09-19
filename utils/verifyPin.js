import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { hashPin } from "./pinHash";

export const verifyPin = async (
  enteredPin,
  securityArea = "master"
) => {
  try {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      return false;
    }

    const userSnap = await getDoc(
      doc(db, "users", uid)
    );

    if (!userSnap.exists()) {
      return false;
    }

    const userData =
      userSnap.data();

    const settings =
      userData.securitySettings || {};

    let storedHash =
      settings.masterPinHash || null;

    const override =
      settings?.overrides?.[
        securityArea
      ];

    if (
      override?.enabled &&
      override?.pinHash
    ) {
      storedHash =
        override.pinHash;
    }

    if (!storedHash) {
      return false;
    }

    const enteredHash =
      await hashPin(enteredPin);

    return (
      enteredHash === storedHash
    );

  } catch (error) {

    console.log(
      "verifyPin error:",
      error
    );

    return false;
  }
};