import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";

export default function useOrganizationCurrency() {

  const [currencySymbol, setCurrencySymbol] =
    useState("GH₵");

  const [currencyCode, setCurrencyCode] =
    useState("GHS");

  const [pricingRegion, setPricingRegion] =
    useState("ghana");

    const [exchangeRates, setExchangeRates] =
  useState({});

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

          const settingsSnap =
  await getDoc(
    doc(
      db,
      "platform",
      "subscriptionSettings"
    )
  );

if (settingsSnap.exists()) {

  const settings =
    settingsSnap.data();

  if (!settings.exchangeRates) {

    const defaults = {
      GHS: 1,
      NGN: 115,
      KES: 14.2,
      USD: 0.083,
      GBP: 0.067,
      EUR: 0.078,
    };

    await setDoc(
      doc(
        db,
        "platform",
        "subscriptionSettings"
      ),
      {
        exchangeRates: defaults,
        baseCurrency: "GHS",
      },
      {
        merge: true,
      }
    );

    setExchangeRates(defaults);

  } else {

    setExchangeRates(
      settings.exchangeRates
    );

  }
}

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
  exchangeRates,
};
}