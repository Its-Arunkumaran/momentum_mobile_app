import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MomentumProvider, useMomentum } from "@/lib/store";
import { Button, Icon, Txt, usePalette } from "@/components/momentum/ui";
import { Onboarding } from "@/components/momentum/onboarding";

function Navigation() {
  const { ready, error, retry, data } = useMomentum();
  const c = usePalette();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
          gap: 20,
        }}
      >
        {error ? (
          <>
            <Txt>{error}</Txt>
            <Button title="Retry loading" onPress={retry} />
          </>
        ) : (
          <>
            <ActivityIndicator color={c.primary} />
            <Txt>Making room for your next step…</Txt>
          </>
        )}
      </View>
    );
  return (
    <>
      <StatusBar style={c.bg === "#121E1B" ? "light" : "dark"} />
      {!data.onboarded ? (
        <Onboarding />
      ) : (
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.muted,
            tabBarStyle: {
              backgroundColor: c.card,
              borderTopColor: c.line,
              height: 82,
              paddingTop: 10,
              paddingBottom: 14,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 4 },
            sceneStyle: { backgroundColor: c.bg },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Today",
              tabBarIcon: ({ focused }) => (
                <Icon name="sun" color={focused ? c.primary : c.muted} />
              ),
            }}
          />
          <Tabs.Screen
            name="plan"
            options={{
              title: "Plan",
              tabBarIcon: ({ focused }) => (
                <Icon name="calendar" color={focused ? c.primary : c.muted} />
              ),
            }}
          />
          <Tabs.Screen
            name="focus"
            options={{
              title: "Focus",
              tabBarBadge: data.active ? "•" : undefined,
              tabBarIcon: ({ focused }) => (
                <Icon name="target" color={focused ? c.primary : c.muted} />
              ),
            }}
          />
          <Tabs.Screen
            name="progress"
            options={{
              title: "Progress",
              tabBarIcon: ({ focused }) => (
                <Icon
                  name="bar-chart-2"
                  color={focused ? c.primary : c.muted}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ focused }) => (
                <Icon name="sliders" color={focused ? c.primary : c.muted} />
              ),
            }}
          />
        </Tabs>
      )}
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MomentumProvider>
        <Navigation />
      </MomentumProvider>
    </SafeAreaProvider>
  );
}
