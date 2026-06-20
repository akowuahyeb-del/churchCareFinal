export function handleQRCode(navigation, data) {
  try {
    console.log("📸 RAW QR:", data);

    const url = new URL(data);

    const type = url.pathname.replace("/", "");
    const params = Object.fromEntries(url.searchParams.entries());

    console.log("✅ QR TYPE:", type);
    console.log("✅ PARAMS:", params);

    switch (type) {
      case "attendance":
        navigation.navigate("AttendanceScreen", {
          entityId: params.church,
          sessionId: params.session,
        });
        break;

      case "register":
        navigation.navigate("AddMember", {
          entityId: params.church,
        });
        break;

      case "event":
        navigation.navigate("EventScreen", {
          entityId: params.church,
          eventName: params.event,
        });
        break;

      case "donate":
        Alert.alert("Donation", "Open donation flow here");
        break;

      case "prayer":
        Alert.alert("Prayer", "Open prayer request screen");
        break;

      default:
        Alert.alert("Unknown QR", "This QR code is not recognised.");
    }

  } catch (e) {
    console.log("❌ QR ERROR:", e);
    Alert.alert("Invalid QR", "This QR code is not valid.");
  }
}
