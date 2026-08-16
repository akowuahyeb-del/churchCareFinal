import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import AppHeader from "../components/AppHeader";

export default function ManageCarouselScreen(
  { navigation }
) {
  const [slides, setSlides] = useState([]);
  const [activeEntity, setActiveEntity] =
    useState(null);

  useEffect(() => {
    loadActiveEntity();
  }, []);

  useEffect(() => {
    if (!activeEntity) return;

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "organizations",
          activeEntity.organizationId,
          "entities",
          activeEntity.entityId,
          "carousel"
        ),
        snap => {
          setSlides(
            snap.docs.map(d => ({
              id: d.id,
              ...d.data(),
            }))
          );
        }
      );

    return unsubscribe;
  }, [activeEntity]);

  const loadActiveEntity =
    async () => {
      const stored =
        await AsyncStorage.getItem(
          "activeEntity"
        );

      if (stored) {
        setActiveEntity(
          JSON.parse(stored)
        );
      }
    };

  const deactivateCarouselItem =
    async (carouselId) => {
      try {
        await updateDoc(
          doc(
            db,
            "organizations",
            activeEntity.organizationId,
            "entities",
            activeEntity.entityId,
            "carousel",
            carouselId
          ),
          {
            active: false,
          }
        );
      } catch (e) {
        Alert.alert(
          "Deactivate failed",
          e.message
        );
      }
    };

  const activateCarouselItem =
    async (carouselId) => {
      try {
        await updateDoc(
          doc(
            db,
            "organizations",
            activeEntity.organizationId,
            "entities",
            activeEntity.entityId,
            "carousel",
            carouselId
          ),
          {
            active: true,
          }
        );
      } catch (e) {
        Alert.alert(
          "Activate failed",
          e.message
        );
      }
    };

  const deleteCarouselItem =
    async (carouselId) => {
      Alert.alert(
        "Delete Slide",
        "This cannot be undone",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteDoc(
                doc(
                  db,
                  "organizations",
                  activeEntity.organizationId,
                  "entities",
                  activeEntity.entityId,
                  "carousel",
                  carouselId
                )
              );
            },
          },
        ]
      );
    };

  return (
    <View style={styles.container}>

      <AppHeader
        title="Manage Carousel"
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView>

        {slides.map(item => (
          <View
            key={item.id}
            style={styles.card}
          >

            <Image
              source={{
                uri: item.imageUrl,
              }}
              style={
                styles.preview
              }
            />

            <View
              style={
                styles.content
              }
            >

              <View
                style={[
                  styles.statusPill,
                  item.active !==
                  false
                    ? styles.active
                    : styles.hidden,
                ]}
              >
                <Text
                  style={
                    styles.statusText
                  }
                >
                  {item.active !==
                  false
                    ? "ACTIVE"
                    : "HIDDEN"}
                </Text>
              </View>

              <View
                style={
                  styles.actions
                }
              >

                {item.active !==
                false ? (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.deactivateBtn,
                    ]}
                    onPress={() =>
                      deactivateCarouselItem(
                        item.id
                      )
                    }
                  >
                    <Text
                      style={
                        styles.btnText
                      }
                    >
                      Deactivate
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.activateBtn,
                    ]}
                    onPress={() =>
                      activateCarouselItem(
                        item.id
                      )
                    }
                  >
                    <Text
                      style={
                        styles.btnText
                      }
                    >
                      Activate
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.deleteBtn,
                  ]}
                  onPress={() =>
                    deleteCarouselItem(
                      item.id
                    )
                  }
                >
                  <Text
                    style={
                      styles.btnText
                    }
                  >
                    Delete
                  </Text>
                </TouchableOpacity>

              </View>

            </View>

          </View>
        ))}

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },

  card: {
    backgroundColor: "#fff",
    margin: 14,
    borderRadius: 16,
    overflow: "hidden",
  },

  preview: {
    width: "100%",
    height: 180,
  },

  content: {
    padding: 12,
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },

  active: {
    backgroundColor: "#E7F8EE",
  },

  hidden: {
    backgroundColor: "#FDECEC",
  },

  statusText: {
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  activateBtn: {
    backgroundColor: "#27AE60",
  },

  deactivateBtn: {
    backgroundColor: "#F39C12",
  },

  deleteBtn: {
    backgroundColor: "#E74C3C",
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
});