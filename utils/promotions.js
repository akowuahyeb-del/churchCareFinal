import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const validatePromotion =
  async (
    code,
    planId,
    organizationId
  ) => {


    const promoSnap = await getDocs(
      query(
        collection(db, "promotions"),
        where(
          "code",
          "==",
          code.trim().toUpperCase()
        )
      )
    );

    if (promoSnap.empty) {
      return {
        valid: false,
        message: "Invalid promo code",
      };
    }

    const promo =
      promoSnap.docs[0].data();

    if (!promo.active) {
      return {
        valid: false,
        message: "Promotion inactive",
      };
    }

    if (
      promo.validUntil &&
      new Date(promo.validUntil) <
        new Date()
    ) {
      return {
        valid: false,
        message: "Promotion expired",
      };
    }

    if (
      promo.maxUses &&
      (promo.usageCount || 0) >=
        promo.maxUses
    ) {
      return {
        valid: false,
        message: "Promotion fully used",
      };
    }

    if (
      promo.plans?.length &&
      !promo.plans.includes(planId)
    ) {
      return {
        valid: false,
        message:
          "Promotion not valid for this plan",
      };
    }
if (organizationId) {

  const redemptionSnap =
    await getDoc(
      doc(
        db,
        "promotionRedemptions",
        `${promo.code}_${organizationId}`
      )
    );

  if (
    redemptionSnap.exists()
  ) {
    return {
      valid: false,
      message:
        "This promotion has already been used by your organization.",
    };
  }
}

    return {
      valid: true,
      promo,
    };
  };

  export const calculateDiscount =
  (
    promo,
    amount
  ) => {

    if (!promo) {
      return {
        discount: 0,
        finalAmount: amount,
      };
    }

    let discount = 0;

    if (
      promo.type === "percentage"
    ) {
      discount =
        amount *
        (promo.value / 100);
    }

    if (
      promo.type === "fixed"
    ) {
      discount =
        promo.value;
    }

    discount = Math.min(
      discount,
      amount
    );

    return {
      discount,
      finalAmount:
        amount - discount,
    };
  };