import { ThemedText } from "@/components/themed-text";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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
  const colors = useTheme();

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

  const handleGoogleSignIn = async () => {
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
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available
      } else {
        // other error
        console.error("Google Sign In error:", JSON.stringify(error));
      }
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: colors.backgroundElement }]}
              onPress={handleSignOut}
            >
              <ThemedText style={styles.googleButtonText}>Sign Out</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Image
              source={require("@/assets/images/budgetify_name.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: colors.backgroundElement }]}
              onPress={handleGoogleSignIn}
            >
              <AntDesign name="google" size={18} color="#fff" style={styles.googleIcon} />
              <ThemedText style={styles.googleButtonText}>
                Sign in with Google
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    width: "100%",
  },
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Spacing.five,
  },
  logo: {
    width: "85%",
    aspectRatio: 2.5,
  },
  buttonSection: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.three,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 220,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    gap: 10,
  },
  googleIcon: {
    marginTop: 1,
  },
  googleButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});
