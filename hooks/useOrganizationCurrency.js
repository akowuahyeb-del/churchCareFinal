import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function useOrganizationCurrency() {

  const [currencySymbol, setCurrencySymbol] =
    useState("GH₵");

  const [currencyCode, setCurrencyCode] =
    useState("GHS");

  const [pricingRegion, setPricingRegion] =
    useState("ghana");

  useEffect(() => {

    const load = async () => {

      try {

        const raw =
          await AsyncStorage.getItem(
            "activeEntity"
          );

        if (!raw) return;

        const entity =
          JSON.parse(raw);

        if (!entity?.organizationId)
          return;

        const snap =
          await getDoc(
            doc(
              db,
              "organizations",
              entity.organizationId
            )
          );

        if (!snap.exists())
          return;

        const org =
          snap.data();

        setCurrencySymbol(
          org.currencySymbol ||
          "GH₵"
        );

        setCurrencyCode(
          org.currencyCode ||
          "GHS"
        );

        setPricingRegion(
          org.pricingRegion ||
          "ghana"
        );

      } catch (e) {

        console.log(
          "Currency load failed",
          e
        );

      }
    };

    load();

  }, []);

  return {
    currencySymbol,
    currencyCode,
    pricingRegion,
  };
}