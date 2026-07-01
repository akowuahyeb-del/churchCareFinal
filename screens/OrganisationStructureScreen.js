import React from "react";
import {
  ScrollView,
  View,
  StyleSheet,
} from "react-native";

import AppHeader from "../components/AppHeader";
import HierarchyLevelsCard from "../components/HierarchyLevelsCard";
import CurrentNodeCard from "../components/CurrentNodeCard";
import VisibilityScopeCard from "../components/VisibilityScopeCard";

import {
  ORGANIZATION_TEMPLATES,
} from "../constants/organizationTemplates";

export default function OrganisationStructureScreen({
  navigation,
}) {
  const template =
    ORGANIZATION_TEMPLATES.presbyterian;

  return (
    <View style={styles.container}>

      <AppHeader
        title="Organisation Structure"
        subtitle="Governance & hierarchy"
        onBack={() => navigation.goBack()}
      />

      <ScrollView>

        <HierarchyLevelsCard
          templateName={template.name}
          levels={template.levels}
        />

        <CurrentNodeCard
          nodeName="Prince of Peace Congregation"
          nodeLevel="Congregation"
           reportsTo="Not Configured"
           status="Active"
          />
        <VisibilityScopeCard
          level="Congregation"
          permissions={[
         "Members",
         "Attendance",
         "Finance",
          "Events",
          ]}
        scopeDescription="Only within this congregation"
       />
          
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },
});
