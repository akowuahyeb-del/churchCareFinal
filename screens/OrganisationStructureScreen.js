import React from "react";
import {
  ScrollView,
  View,
  StyleSheet,
} from "react-native";

import AppHeader from "../components/AppHeader";
import StructureTemplateCard from "../components/StructureTemplateCard";

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

        <StructureTemplateCard
          templateName={template.name}
          levels={template.levels}
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
