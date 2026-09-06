import { Redirect } from "expo-router";

import { useCurrentUser } from "@/hooks/data/use-current-user";

export default function Index() {
  const { user, loading } = useCurrentUser();

  if (loading) return null;

  return <Redirect href={user ? "/(tabs)/home" : "/login"} />;
}
