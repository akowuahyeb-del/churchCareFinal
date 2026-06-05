import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";

/* SCREENS */
import HomeScreen           from "./screens/HomeScreen";
import MembersScreen        from "./screens/MembersScreen";
import AttendanceScreen     from "./screens/AttendanceScreen";
import SettingsScreen       from "./screens/SettingsScreen";
import MemberProfileScreen  from "./screens/MemberProfileScreen";
import AdminDashboard       from "./screens/AdminDashboard";
import DashboardDetailsScreen from "./screens/DashboardDetailsScreen";
import HistoryScreen        from "./screens/HistoryScreen";
import DonateScreen         from "./screens/DonateScreen"; // ✅ NEW

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MembersMain"   component={MembersScreen} />
      <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   "#4B3F72",
        tabBarInactiveTintColor: "#aaa",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#4B3F72",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:       focused ? "home"             : "home-outline",
            Members:    focused ? "people"           : "people-outline",
            Attendance: focused ? "checkmark-circle" : "checkmark-circle-outline",
            History:    focused ? "time"             : "time-outline",
            Settings:   focused ? "settings"         : "settings-outline",
          };
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={icons[route.name]} size={20} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"       component={HomeScreen} />
      <Tab.Screen name="Members"    component={MembersStack} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="History"    component={HistoryScreen} />
      <Tab.Screen name="Settings"   component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"          component={MainTabs} />
      <Stack.Screen name="AdminDashboard"    component={AdminDashboard} />
      <Stack.Screen name="DashboardDetails"  component={DashboardDetailsScreen} />
      <Stack.Screen name="Donate"            component={DonateScreen} />  {/* ✅ NEW */}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap:       { width: 36, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  iconWrapActive: { backgroundColor: "#EEF0FA" },
});
