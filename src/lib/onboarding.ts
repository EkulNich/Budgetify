import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = (userId: string) => `budgetify:hasSeenOnboarding:${userId}`;

/** Whether this user has already been through the first-time onboarding carousel. */
export async function hasSeenOnboarding(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(storageKey(userId))) === "true";
}

export async function markOnboardingSeen(userId: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), "true");
}
