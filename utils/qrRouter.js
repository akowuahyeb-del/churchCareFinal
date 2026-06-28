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


async function findOpenSession(organizationId, entityId) {
  const today = new Date().toISOString().split("T")[0];

  const sessionsRef = collection(
    db, "organizations", organizationId, "entities", entityId, "sessions"
  );
  const q = query(sessionsRef, where("date", "==", today));
  const snap = await getDocs(q);

  const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const live = sessions
    .filter(s => s.status === "open" || s.status === "extended")
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  return live[0] || null;
}


async function markMemberAttendance(memberCode, entityId) {
  try {
    const data = await AsyncStorage.getItem("activeEntity");
    if (!data) return;

    const { organizationId } = JSON.parse(data);

    const membersRef = collection(
      db, "organizations", organizationId, "entities", entityId, "members"
    );

    const mq = query(membersRef, where("memberCode", "==", memberCode));
    const memberSnap = await getDocs(mq);

    if (memberSnap.empty) {
      Alert.alert("Not Found", "Member not found");
      return;
    }

    const memberDoc = memberSnap.docs[0];
    const member = { id: memberDoc.id, ...memberDoc.data() };

    const session = await findOpenSession(organizationId, entityId);

    if (!session) {
      Alert.alert(
        "No Service Open",
        "There's no active service session right now. Ask an admin to start one."
      );
      return;
    }

    const attendanceRef = collection(
      db, "organizations", organizationId, "entities", entityId, "attendance"
    );

    const dupQ = query(
      attendanceRef,
      where("memberCode", "==", memberCode),
      where("sessionId", "==", session.id)
    );
    const dupSnap = await getDocs(dupQ);

    if (!dupSnap.empty) {
      Alert.alert("Already Checked In", `${member.name} is already recorded for this service.`);
      return;
    }

    await addDoc(attendanceRef, {
      memberId: member.id,
      memberCode,
      name: member.name,
      phone: member.phone || "",
      ministry: member.ministry || "",
      entityId,
      organizationId,
      sessionId: session.id,
      service: session.service,
      type: session.type,
      event: session.event || "",
      date: session.date,
      status: "present",
      method: "qr",
      timestamp: new Date().toISOString()
    });

    console.log("✅ Member attendance recorded:", member.name);
    Alert.alert("✅ Checked In", `${member.name} — ${session.service} (${session.type})`);

  } catch (e) {
    console.log("❌ Member attendance error:", e);
    Alert.alert("Error", "Could not record attendance. Please try again.");
  }
}


// ✅ FIXED: manual parsing instead of `new URL(data)` / `.searchParams` —
// same Hermes/polyfill problem as the generator side, just on decode.
// This works for any string, in any JS environment, no Web API needed.
function parseDeepLink(data) {
  const schemeMatch = data.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
  if (!schemeMatch) return null;

  const withoutScheme = data.slice(schemeMatch[0].length); // "attendance?church=...&session=..."
  const [type, queryStr = ""] = withoutScheme.split("?");

  const params = {};
  queryStr.split("&").filter(Boolean).forEach(pair => {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = v !== undefined ? decodeURIComponent(v) : "";
  });

  return { type: type.replace(/\/$/, ""), params };
}


// ✅ ✅ ✅ MAIN QR ROUTER
export async function handleQRCode(navigation, data) {
  try {
    console.log("📸 RAW QR:", data);

    // ✅ 1. MEMBER BADGE — JSON, permanent per member, in-app only
    try {
      const parsed = JSON.parse(data);

      if (parsed.memberCode) {
        await markMemberAttendance(parsed.memberCode, parsed.entityId);
        return;
      }
    } catch {
      // not a member QR → continue to URL-based links below
    }

    // ✅ 2. URL-BASED DEEP LINKS
    const parsedLink = parseDeepLink(data);
    if (!parsedLink) {
      Alert.alert("Invalid QR", "This QR code is not valid.");
      return;
    }

    const { type, params } = parsedLink;

    console.log("✅ QR TYPE:", type);
    console.log("✅ PARAMS:", params);

    switch (type) {

      case "attendance":
        navigation.navigate("Attendance", {
          resumeSessionId: params.session,
          resumeEntityId: params.entity
        });
        break;

      case "register":
        navigation.navigate("AddMember", {
          entityId: params.entity,
        });
        break;

      case "event":
        navigation.navigate("Events", {  // ⚠️ confirm this matches your navigator's registered route name
          eventId: params.eventId,
        });
        break;

      case "donate":
        navigation.navigate("Donate", {
          entityId: params.entity,
          amount: params.amount,
          category: params.category,
        });
        break;

      case "prayer":
        navigation.navigate("PrayerRequestScreen", {
          entityId:params.entity ,
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