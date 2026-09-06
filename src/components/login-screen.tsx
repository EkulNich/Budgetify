import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import {
  GoogleSignin,
  GoogleSigninButton,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ensureProfileRow } from "@/lib/profile";
import { supabase } from "../lib/supabase";

GoogleSignin.configure({
  iosClientId:
    "530067833499-acm4u36k4a8n3ehni1q9rmchrp6ml4b5.apps.googleusercontent.com",
  webClientId:
    "530067833499-kft423v0th9oltpji8gbanmo958qjoll.apps.googleusercontent.com",
  scopes: ["profile", "email"],
});

export default function LoginScreen() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });
  }, []);

  const handleSignOut = async () => {
    await GoogleSignin.signOut();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      {isSignedIn ? (
        <View style={{ flex: 1, width: "100%" }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 20, left: 20 }}
            onPress={() => {
              router.replace("/(tabs)/home");
            }}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>

          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <TouchableOpacity style={styles.button} onPress={handleSignOut}>
              <ThemedText style={{ color: "white" }}>Sign Out</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={async () => {
            try {
              if (Platform.OS === "android") {
                await GoogleSignin.hasPlayServices();
              }
              const response = await GoogleSignin.signIn();
              if (isSuccessResponse(response) && response.data.idToken) {
                const { data, error } = await supabase.auth.signInWithIdToken({
                  provider: "google",
                  token: response.data.idToken,
                });
                if (!error && data.user) {
                  await ensureProfileRow(data.user);
                  router.replace("/(tabs)/home");
                } else if (error) {
                  console.error("Sign in error:", error.message);
                }
              }
            } catch (error: any) {
              if (error.code === statusCodes.IN_PROGRESS) {
                // already in progress
              } else if (
                error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
              ) {
                // play services not available
              } else {
                // other error
                console.error("Google Sign In error:", JSON.stringify(error));
              }
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minWidth: 160,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D612A",
  },
});
