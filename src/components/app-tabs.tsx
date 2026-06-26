import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
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
