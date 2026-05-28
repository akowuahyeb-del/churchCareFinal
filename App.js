import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

/* ✅ SCREENS */
import HomeScreen from "./screens/HomeScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import MembersScreen from "./screens/MembersScreen";

/* ✅ PLACEHOLDERS */
import { View, Text } from "react-native";

const Placeholder = ({ title }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>{title}</Text>
  </View>
);

const ReportsScreen = () => <Placeholder title="Reports" />;
const NotifyScreen = () => <Placeholder title="Notifications" />;
const SettingsScreen = () => <Placeholder title="Settings" />;

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,

          tabBarIcon: ({ color, size }) => {
            let icon;

            switch (route.name) {
              case "Dashboard":
                icon = "home";
                break;
              case "Attendance":
                icon = "check-circle";
                break;
              case "Members":
                icon = "users";
                break;
              case "Reports":
                icon = "bar-chart-2";
                break;
              case "Notify":
                icon = "bell";
                break;
              case "Settings":
                icon = "settings";
                break;
              default:
                icon = "circle";
            }

            return <Feather name={icon} size={size} color={color} />;
          },

          tabBarActiveTintColor: "#4B3F72",
          tabBarInactiveTintColor: "#999"
        })}
      >

        <Tab.Screen name="Dashboard" component={HomeScreen} />
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen name="Members" component={MembersScreen} />

        {/* ✅ RESTORED */}
        <Tab.Screen name="Reports" component={ReportsScreen} />
        <Tab.Screen name="Notify" component={NotifyScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />

      </Tab.Navigator>
    </NavigationContainer>
  );
}
``