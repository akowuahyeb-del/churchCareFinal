

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View,Text, StyleSheet, Platform } from "react-native";
import { StatusBar} from "react-native";

/* ── SCREENS ── */
import SplashScreen            from "./screens/SplashScreen";
import LoginScreen             from "./screens/LoginScreen";
import HomeScreen              from "./screens/HomeScreen";
import MembersScreen           from "./screens/MembersScreen";
import AttendanceScreen        from "./screens/AttendanceScreen";
import SettingsScreen          from "./screens/SettingsScreen";
import MemberProfileScreen     from "./screens/MemberProfileScreen";
import AdminDashboard          from "./screens/AdminDashboard";
import DashboardDetailsScreen  from "./screens/DashboardDetailsScreen";
import DonateScreen            from "./screens/DonateScreen";
import HistoryScreen           from "./screens/HistoryScreen";
import AdminFinanceScreen      from "./screens/AdminFinanceScreen";
import TransferRequestsScreen  from "./screens/TransferRequestsScreen";
import AdminTransferScreen     from "./screens/AdminTransferScreen";
import HelpScreen              from "./screens/HelpScreen";
import DepartmentsScreen       from "./screens/DepartmentsScreen";
import EventsScreen            from "./screens/EventsScreen";
import MoreScreen              from "./screens/MoreScreen";
import CreateChurchScreen      from "./screens/CreateChurchScreen";
import AddMemberScreen from "./screens/AddMemberScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import ChurchSelectScreen from "./screens/ChurchSelectScreen";
import ImportMembersScreen from "./screens/ImportMembersScreen";
import CompleteProfileScreen from "./screens/CompleteProfileScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
import RolesScreen from "./screens/RolesScreen";
import AssignMemberRolesScreen from "./screens/AssignMemberRolesScreen";
import { ChurchProvider } from "./context/ChurchContext";
import VerifyReceiptScreen from "./screens/VerifyReceiptScreen";
import ApprovalScreen from "./screens/ApprovalScreen";
import SubscriptionScreen from "./screens/SubscriptionScreen";








const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab config — single source of truth ──────────────────────────
const TABS = [
  { name: "Home",       label: "Home",       icon: "home",            component: null },
  { name: "Members",    label: "Members",    icon: "people",          component: null },
  { name: "Attendance", label: "Attendance", icon: "checkmark-circle",component: null },
  { name: "Help",       label: "Help",       icon: "help-circle",     component: null },
  { name: "More",       label: "More",       icon: "grid",            component: null },
];

/* ── Members stack (keeps MemberProfile inside Members tab) ── */
function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MembersMain"    component={MembersScreen}       />
      <Stack.Screen name="MemberProfile"  component={MemberProfileScreen} />
    </Stack.Navigator>
  );
}

/* ── Main bottom tabs ─────────────────────────────────────────── */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   "#4B3F72",
        tabBarInactiveTintColor: "#aaa",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const tab  = TABS.find(t => t.name === route.name);
          const base = tab?.icon || "ellipse";
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? base : `${base}-outline`}
                size={20}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"       component={HomeScreen}    />
      <Tab.Screen name="Members"    component={MembersStack}  />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Help"       component={HelpScreen}    />
      <Tab.Screen name="More"       component={MoreScreen}    />
    </Tab.Navigator>
  );
}

/* ── Root stack ───────────────────────────────────────────────── */
function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      {/* Auth flow */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login"  component={LoginScreen}  />

      {/* Main app */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Screens reachable from anywhere in the root stack */}
      <Stack.Screen name="AdminDashboard"  component={AdminDashboard}         />
      <Stack.Screen name="DashboardDetails"component={DashboardDetailsScreen} />
      <Stack.Screen name="Donate"          component={DonateScreen}           />
      <Stack.Screen name="Finance"         component={AdminFinanceScreen}     />
      <Stack.Screen name="TransferRequests"component={TransferRequestsScreen} />
      <Stack.Screen name="AdminTransfers"  component={AdminTransferScreen}    />
      <Stack.Screen name="Settings"        component={SettingsScreen}         />
      <Stack.Screen name="Departments"     component={DepartmentsScreen}      />
      <Stack.Screen name="Events"          component={EventsScreen}           />
      <Stack.Screen name="History"         component={HistoryScreen}          />
      <Stack.Screen name="CreateChurch"    component={CreateChurchScreen}     />
      <Stack.Screen name="AddMember" component={AddMemberScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen}/>
      <Stack.Screen name="ChurchSelect"component={ChurchSelectScreen}/>
      <Stack.Screen name="ImportMembers" component={ImportMembersScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Roles"component={RolesScreen}options={{ title: "Roles & Privileges" }}/>
       <Stack.Screen name="AssignMemberRolesScreen" component={AssignMemberRolesScreen} />
       <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
       <Stack.Screen name="VerifyReceipt"component={VerifyReceiptScreen} />
       <Stack.Screen name="Approval" component={ApprovalScreen}/>
       <Stack.Screen name="Subscription"component={SubscriptionScreen}options={{ headerShown: false }}/>







    </Stack.Navigator>
  );
}


const linking = {
  prefixes: ["churchcare://"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Attendance: "attendance"
        }
      }
    }
  }
};

export default function App() {
  return (
    <ChurchProvider>
      <StatusBar
        translucent={false}
        backgroundColor="#4B3F72"
        barStyle="light-content"
      />

      <NavigationContainer linking={linking}>
        <RootStack />
      </NavigationContainer>
    </ChurchProvider>
  );
}


const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 0,
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    height: Platform.OS === "ios" ? 82 : 68,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  iconWrap: {
    width: 38,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: "#EEF0FA",
  },
});
