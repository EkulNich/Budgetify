import { useTheme } from "@/hooks/use-theme";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Image, Platform } from "react-native";

const TAB_ICONS = {
  home: require("@/assets/images/tabIcons/home.png"),
  stats: require("@/assets/images/tabIcons/stats.png"),
  add: require("@/assets/images/tabIcons/add.png"),
  social: require("@/assets/images/tabIcons/social.png"),
  profile: require("@/assets/images/tabIcons/profile.png"),
} as const;

const TABS = [
  { name: "home", label: "home" },
  { name: "stats", label: "stats" },
  { name: "add", label: "add" },
  { name: "social", label: "social" },
  { name: "profile", label: "profile" },
] as const;

function IOSTabs() {
  const colors = useTheme();
  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
      iconColor={colors.backgroundElement}
    >
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <Label>{tab.label}</Label>
          <Icon src={TAB_ICONS[tab.name]} />
        </NativeTabs.Trigger>
      ))}
      <NativeTabs.Trigger name="login" hidden />
    </NativeTabs>
  );
}

function AndroidTabs() {
  const colors = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.backgroundElement,
        tabBarInactiveTintColor: "#000000",
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color }) => (
              <Image
                source={TAB_ICONS[tab.name]}
                style={{ width: 24, height: 24, tintColor: color }}
              />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}

export default function AppTabs() {
  return Platform.OS === "ios" ? <IOSTabs /> : <AndroidTabs />;
}
