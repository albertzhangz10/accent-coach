import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0f" },
          headerTintColor: "#f5f5f7",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0a0a0f" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Accent Coach" }} />
        <Stack.Screen name="lesson/[id]" options={{ title: "" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: "fade" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
