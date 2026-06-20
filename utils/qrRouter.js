import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";


// ✅ ✅ ✅ MEMBER ATTENDANCE (IDENTITY-BASED)
async function markMemberAttendance(memberCode, entityId) {
  try {
    const data = await AsyncStorage.getItem("activeEntity");
    if (!data) return;

    const { organizationId } = JSON.parse(data);

    // ✅ find member
    const ref = collection(
      db,
      "organizations",
      organizationId,
      "entities",
      entityId,
      "members"
    );

    const q = query(ref, where("memberCode", "==", memberCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      Alert.alert("Not found", "Member not found");
      return;
    }

    const member = snap.docs[0].data();

    // ✅ save attendance
    await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "attendance"
      ),
      {
        memberCode,
        name: member.name,
        sessionId: "member-scan",
        timestamp: new Date().toISOString(),
      }
    );

    console.log("✅ Member attendance recorded:", member.name);
    Alert.alert("✅ Checked In", member.name);

  } catch (e) {
    console.log("❌ Member attendance error:", e);
  }
}


// ✅ ✅ ✅ GENERAL ATTENDANCE (SESSION BASED)
async function markAttendance(entityId, sessionId) {
  try {
    const data = await AsyncStorage.getItem("activeEntity");

    if (!data) {
      console.log("❌ No active entity found");
      return;
    }

    const { organizationId } = JSON.parse(data);

    await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "attendance"
      ),
      {
        sessionId,
        timestamp: new Date().toISOString(),
      }
    );

    console.log("✅ Attendance recorded for org:", organizationId);

  } catch (e) {
    console.log("❌ Attendance error:", e);
  }
}


// ✅ ✅ ✅ MAIN QR ROUTER
export async function handleQRCode(navigation, data) {
  try {
    console.log("📸 RAW QR:", data);

    // ✅ 1. TRY MEMBER QR FIRST
    try {
      const parsed = JSON.parse(data);

      if (parsed.memberCode) {
        await markMemberAttendance(
          parsed.memberCode,
          parsed.entityId
        );
        return; // ✅ STOP here
      }

    } catch {
      // not a member QR → continue
    }

    // ✅ 2. HANDLE NORMAL QR LINKS
    const url = new URL(data);
    const type = url.pathname.replace("/", "");
    const params = Object.fromEntries(url.searchParams.entries());

    console.log("✅ QR TYPE:", type);
    console.log("✅ PARAMS:", params);

    switch (type) {

      // ✅ ATTENDANCE QR
      case "attendance":
        await markAttendance(params.church, params.session);

        navigation.navigate("AttendanceScreen", {
          entityId: params.church,
          sessionId: params.session,
        });
        break;

      // ✅ REGISTER QR
      case "register":
        navigation.navigate("AddMember", {
          entityId: params.church,
        });
        break;

      // ✅ EVENT QR
      case "event":
        navigation.navigate("EventScreen", {
          entityId: params.church,
          eventName: params.event,
        });
        break;

      // ✅ DONATION
      case "donate":
        Alert.alert("Donation", "Open donation flow here");
        break;

      // ✅ PRAYER
      case "prayer":
        navigation.navigate("PrayerRequestScreen", {
          entityId: params.church,
        });
        break;

      default:
        Alert.alert("Unknown QR", "This QR code is not recognised.");
    }

  } catch (e) {
    console.log("❌ QR ERROR:", e);
    Alert.alert("Invalid QR", "This QR code is not valid.");
  }
}