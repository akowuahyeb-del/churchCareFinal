/*
  PATCH — add these two things to your existing MembersScreen.js
  ─────────────────────────────────────────────────────────────
  1. Import Ionicons if not already imported:
       import { Ionicons } from "@expo/vector-icons";

  2. In your component, wherever `navigation` is available,
     add this Donate button. Recommended placement: in the
     header row next to your existing title/search bar,
     OR as a floating button above the member list.

  OPTION A — Header row button (paste inside your header View):
*/

// ── Inside your header / top bar ──────────────────────────────
<TouchableOpacity
  style={styles.donateHeaderBtn}
  onPress={() => navigation.navigate("Donate")}   // general donation (no member)
>
  <Ionicons name="heart" size={16} color="#fff" />
  <Text style={styles.donateHeaderBtnText}>Donate</Text>
</TouchableOpacity>

// ── On each member row / card, add a per-member Donate icon ───
// (inside your FlatList renderItem, next to the member name):
<TouchableOpacity
  onPress={() => navigation.navigate("Donate", {
    memberId:   item.id,
    memberName: item.name,
  })}
  style={styles.memberDonateBtn}
>
  <Ionicons name="heart-outline" size={18} color="#E11D48" />
</TouchableOpacity>

/*
  3. Add these styles to your MembersScreen StyleSheet:
*/
// donateHeaderBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E11D48", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 5 },
// donateHeaderBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
// memberDonateBtn: { padding: 6 },

/*
  ─────────────────────────────────────────────────────────────
  HOW IT WORKS:
  • Header Donate button  → navigate("Donate")
      Opens DonateScreen without a memberId = general donation
      History tab shows all donations.

  • Per-member heart icon → navigate("Donate", { memberId, memberName })
      Opens DonateScreen scoped to that member.
      History tab shows only that member's donations.
      The member's total given appears in the header pill.
  ─────────────────────────────────────────────────────────────
*/
