// utils/subscription.js
import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  doc, getDoc, setDoc, onSnapshot,
  collection, getDocs
} from "firebase/firestore";
import {
  getPlan, getLimit, planHasFeature,
  LIMITS, TRIAL_PLAN_ID, TRIAL_DAYS
} from "../constants/subscriptionPlans";

// ✅ Subscription lives at the ORGANIZATION level (not per-entity) — a
// church with 3 branches shares one bill, which matches how
// organizationId/entityId are already structured everywhere else in
// this app (members, roles, etc are per-entity; billing is per-org).
const subRef = (organizationId) =>
  doc(db, "organizations", organizationId, "billing", "subscription");

// ✅ Seed a free trial the first time an organization has no subscription
// doc at all — same auto-seed pattern as DEFAULT_ROLES in RolesScreen.js.
const seedTrialSubscription = async (organizationId) => {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const payload = {
    planId: TRIAL_PLAN_ID,
    status: "trialing",
    trialEndsAt: trialEndsAt.toISOString(),
    currentPeriodEnd: trialEndsAt.toISOString(),
    createdAt: new Date().toISOString(),
    // Paystack fields — populated once a real payment is made
    paystackCustomerCode: null,
    paystackSubscriptionCode: null,
  };

  await setDoc(subRef(organizationId), payload);
  return payload;
};

export function useSubscription(organizationId, entityId) {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ members: 0, entities: 0, admins: 0 });
  const [loading, setLoading] = useState(true);

  // ✅ Real-time — an upgrade/downgrade or a webhook-driven status change
  // (e.g. payment failed → past_due) reflects everywhere instantly,
  // without anyone needing to reopen the app.
  useEffect(() => {
    if (!organizationId) return;

    const ref = subRef(organizationId);
    let unsub;

    const init = async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await seedTrialSubscription(organizationId);
      }
      unsub = onSnapshot(ref, s => {
        setSubscription(s.exists() ? s.data() : null);
        setLoading(false);
      });
    };

    init();
    return () => unsub && unsub();
  }, [organizationId]);

  // ✅ Live usage counts — what limits actually check against
  const loadUsage = useCallback(async () => {
    if (!organizationId || !entityId) return;
    try {
      const [membersSnap, entitiesSnap] = await Promise.all([
        getDocs(collection(db, "organizations", organizationId, "entities", entityId, "members")),
        getDocs(collection(db, "organizations", organizationId, "entities")),
      ]);

      const admins = membersSnap.docs.filter(d =>
        (d.data().permissions || []).includes("manage_members")
      ).length;

      setUsage({
        members: membersSnap.size,
        entities: entitiesSnap.size,
        admins,
      });
    } catch (e) {
      console.log("❌ Load usage error:", e);
    }
  }, [organizationId, entityId]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  const planId = subscription?.planId || "free";
  const plan = getPlan(planId);

  // ✅ A trial that's run out behaves like Free until they actually pay —
  // no feature silently stays unlocked forever just because trialing
  // was the status at signup.
  const isTrialExpired =
    subscription?.status === "trialing" &&
    subscription?.trialEndsAt &&
    new Date(subscription.trialEndsAt) < new Date();

  const effectivePlanId = isTrialExpired ? "free" : planId;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  const daysLeftInTrial = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / 86400000))
    : 0;

  const hasFeature = (feature) =>
    isActive && !isTrialExpired && planHasFeature(effectivePlanId, feature);

  const checkLimit = (limitKey, usageKey) => {
    const limit = getLimit(effectivePlanId, limitKey);
    const used = usage[usageKey] ?? 0;
    return {
      limit,                                  // null = unlimited
      used,
      isUnlimited: limit === null,
      isAtLimit: limit !== null && used >= limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
    };
  };

  return {
    subscription,
    plan: getPlan(effectivePlanId),
    planId: effectivePlanId,
    status: subscription?.status || "free",
    isActive,
    isTrialExpired,
    daysLeftInTrial,
    usage,
    loading,
    hasFeature,
    membersLimit: checkLimit(LIMITS.MAX_MEMBERS, "members"),
    entitiesLimit: checkLimit(LIMITS.MAX_ENTITIES, "entities"),
    adminsLimit: checkLimit(LIMITS.MAX_ADMINS, "admins"),
    refreshUsage: loadUsage,
  };
}