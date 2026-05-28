import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Feather } from "@expo/vector-icons";

// ✅ Screens
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import AttendanceScreen from "./screens/AttendanceScreen";

// ✅ Temporary placeholders (we will build later)
import { View, Text } from "react-native";

function MembersScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Members Screen</Text>
    </View>
  );
}

function ReportsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Reports Screen</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ✅ BOTTOM NAVIGATION */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4B3F72",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          height: 60,
          paddingBottom: 6
        },
        tabBarLabelStyle: {
          fontSize: 11
        }
      }}
    >

      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="edit" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Members"
        component={MembersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          )
        }}
      />

    </Tab.Navigator>
  );
}

/* ✅ ROOT NAVIGATION */
export default function App() {
  return (
    <NavigationContainer>

      <Stack.Navigator screenOptions={{ headerShown: false }}>

        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* ✅ CRITICAL: loads your dashboard + tabs */}
        <Stack.Screen name="Home" component={MainTabs} />

      </Stack.Navigator>

    </NavigationContainer>
  );
}