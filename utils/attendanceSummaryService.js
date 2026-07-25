
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";


export async function getAttendanceSummary(
  organizationId,
  entityId,
  dateRange = "4w"
) {
  try {
    const membersSnap = await getDocs(
      collection(
        db,
        "organizations",
        organizationId,
        "entities",
        entityId,
        "members"
      )
    );
const sessionsSnap = await getDocs(
  query(
    collection(
      db,
      "organizations",
      organizationId,
      "entities",
      entityId,
      "sessions"
    ),
    where("status", "==", "ended")
  )
);

const sessions = sessionsSnap.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));
const sessionsCount = sessions.length;

const avgPresent =
  sessionsCount > 0
    ? Math.round(
        sessions.reduce(
          (sum, s) => sum + (s.finalPresent || 0),
          0
        ) / sessionsCount
      )
    : 0;

const avgRate =
  sessionsCount > 0
    ? Math.round(
        sessions.reduce(
          (sum, s) => sum + (s.finalRate || 0),
          0
        ) / sessionsCount
      )
    : 0;

const peakPresent =
  sessionsCount > 0
    ? Math.max(
        ...sessions.map(s => s.finalPresent || 0)
      )
    : 0;

    const members = membersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const membersCount = members.length;

    const invitedCount = members.filter(
      m => m.lifecycleStatus === "invited"
    ).length;

    const registeredCount = members.filter(
      m => m.lifecycleStatus === "registered"
    ).length;

    const activeUserCount = members.filter(
      m => m.lifecycleStatus === "active_user"
    ).length;

    return {
      membersCount,

      invitedCount,
      registeredCount,
      activeUserCount,

     localMemberCount: membersCount,
awayCount: 0,

avgPresent,
avgRate,
peakPresent,
sessionsCount,
    };

  } catch (e) {
    console.log("❌ getAttendanceSummary:", e);

    return {
  membersCount,

  invitedCount,
  registeredCount,
  activeUserCount,

  localMemberCount: membersCount,
  awayCount: 0,

  avgPresent,
  avgRate,
  peakPresent,
  sessionsCount,
};
  }
}