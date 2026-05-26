import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { COLORS } from "./src/theme";
import SplashScreenAnim from "./src/components/SplashScreen";
import Logo from "./src/components/Logo";

// Auth Screens
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";

// Main Screens
import DashboardScreen from "./src/screens/main/DashboardScreen";
import SOSScreen from "./src/screens/main/SOSScreen";
import ReportIncidentScreen from "./src/screens/main/ReportIncidentScreen";
import ProfileScreen from "./src/screens/main/ProfileScreen";
import MyIncidentsScreen from "./src/screens/main/MyIncidentsScreen";
import HelplinesScreen from "./src/screens/main/HelplinesScreen";
import SafeRoutesScreen from "./src/screens/main/SafeRoutesScreen";
import LegalResourcesScreen from "./src/screens/main/LegalResourcesScreen";
import CounselingScreen from "./src/screens/main/CounselingScreen";
import ChildSafetyScreen from "./src/screens/main/ChildSafetyScreen";
import AdminDashboardScreen from "./src/screens/admin/AdminDashboardScreen";
import ParentDashboardScreen from "./src/screens/main/ParentDashboardScreen";

import { Text } from "react-native";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_SCREENS = [
  { name: "Dashboard", component: DashboardScreen,      icon: "🏠", label: "Home" },
  { name: "SOS",       component: SOSScreen,            icon: "🆘", label: "SOS",    sos: true },
  { name: "Report",    component: ReportIncidentScreen, icon: "📝", label: "Report" },
  { name: "Profile",   component: ProfileScreen,        icon: "👤", label: "Profile" },
];

const PARENT_TAB_SCREENS = [
  { name: "ParentHome", component: ParentDashboardScreen, icon: "🛡️", label: "Alerts" },
  { name: "Profile",   component: ProfileScreen,          icon: "👤", label: "Profile" },
];

function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {PARENT_TAB_SCREENS.map(({ name, component, icon, label }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {TAB_SCREENS.map(({ name, component, icon, label, sos }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ focused }) => (
              sos ? (
                <View style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: COLORS.danger,
                  alignItems: "center", justifyContent: "center",
                  marginBottom: 2,
                  shadowColor: COLORS.danger,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
                }}>
                  <Text style={{ fontSize: 20 }}>{icon}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{icon}</Text>
              )
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading, isParent } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.primaryBg }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: "700" },
        headerBackTitle: "",
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={isParent ? ParentTabs : MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="MyIncidents" component={MyIncidentsScreen} options={{ title: "My Incidents" }} />
          <Stack.Screen name="Helplines" component={HelplinesScreen} options={{ title: "Emergency Helplines" }} />
          <Stack.Screen name="SafeRoutes" component={SafeRoutesScreen} options={{ title: "Safe Routes & Places" }} />
          <Stack.Screen name="LegalResources" component={LegalResourcesScreen} options={{ title: "Legal Resources" }} />
          <Stack.Screen name="Counseling" component={CounselingScreen} options={{ title: "Counseling Support" }} />
          <Stack.Screen name="ChildSafety" component={ChildSafetyScreen} options={{ title: "Child Safety" }} />
          {user.role === "admin" && (
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Admin Dashboard" }} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <SplashScreenAnim onFinish={() => setSplashDone(true)} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
