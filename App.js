import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import MoreScreen from "./screens/MoreScreen";

/* SCREENS */
import HomeScreen from "./screens/HomeScreen";
import MembersScreen from "./screens/MembersScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import SettingsScreen from "./screens/SettingsScreen";
import MemberProfileScreen from "./screens/MemberProfileScreen";
import AdminDashboard from "./screens/AdminDashboard";
import DashboardDetailsScreen from "./screens/DashboardDetailsScreen";
import DonateScreen from "./screens/DonateScreen";
import HistoryScreen from "./screens/HistoryScreen";
import AdminFinanceScreen from "./screens/AdminFinanceScreen";
import TransferRequestsScreen from "./screens/TransferRequestsScreen";
import AdminTransferScreen from "./screens/AdminTransferScreen"; 
import HelpScreen from "./screens/HelpScreen";
import DepartmentsScreen from "./screens/DepartmentsScreen";
import EventsScreen from "./screens/EventsScreen";



const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* ── MEMBERS STACK ── */
function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MembersMain" component={MembersScreen} />
      <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
    </Stack.Navigator>
  );
}

/* ── MAIN TAB NAVIGATION ── */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#4B3F72",
        tabBarInactiveTintColor: "#aaa",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 12,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
  Home: "home",
  Members: "people",
  Attendance: "checkmark-circle",
  History: "time",
  More: "grid",   
};

          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? icons[route.name] : `${icons[route.name]}-outline`}
                size={20}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Members" component={MembersStack} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
    </Tab.Navigator>
  );
}

/* ── ROOT STACK ── */
function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="DashboardDetails" component={DashboardDetailsScreen} />
      <Stack.Screen name="DonateScreen" component={DonateScreen} />
      <Stack.Screen name="Finance" component={AdminFinanceScreen} />
      <Stack.Screen name="TransferRequests" component={TransferRequestsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />



      {/* ✅ ADMIN TRANSFER SCREEN */}
      <Stack.Screen
        name="AdminTransfers"
        component={AdminTransferScreen}
      />
    </Stack.Navigator>
  );
}

/* ── APP ROOT ── */
export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: "#EEF0FA",
  },
});