import { Colors } from "@/constants/theme";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Image, Platform, useColorScheme } from "react-native";

function IOSTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];
  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
      iconColor={colors.backgroundElement}
    >
      <NativeTabs.Trigger name="home">
        <Label>home</Label>
        <Icon src={require("@/assets/images/tabIcons/home.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <Label>stats</Label>
        <Icon src={require("@/assets/images/tabIcons/stats.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="add">
        <Label>add</Label>
        <Icon src={require("@/assets/images/tabIcons/add.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="social">
        <Label>social</Label>
        <Icon src={require("@/assets/images/tabIcons/social.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>profile</Label>
        <Icon src={require("@/assets/images/tabIcons/profile.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="login" hidden />
    </NativeTabs>
  );
}

function AndroidTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.backgroundElement,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "home",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("@/assets/images/tabIcons/home.png")}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "stats",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("@/assets/images/tabIcons/stats.png")}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "add",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("@/assets/images/tabIcons/add.png")}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "social",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("@/assets/images/tabIcons/social.png")}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "profile",
          tabBarIcon: ({ color }) => (
            <Image
              source={require("@/assets/images/tabIcons/profile.png")}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}

export default function AppTabs() {
  return Platform.OS === "ios" ? <IOSTabs /> : <AndroidTabs />;
}
