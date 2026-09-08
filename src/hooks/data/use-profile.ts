import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  username: string | null;
  bio: string | null;
  monthly_salary: number | null;
  hours_per_week: number | null;
  monthly_budget: number | null;
  streak_count: number | null;
  last_expense_date: string | null;
  currency: string;
  hide_budget_from_friends: boolean;
  is_private: boolean;
  discoverable: boolean;
};

/** Fetches (and lets you update) the current user's `profiles` row. */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateProfile = useCallback(
    async (fields: Partial<Omit<Profile, "id">>) => {
      if (!userId) {
        throw new Error("Cannot update profile: no signed-in user");
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...fields });
      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
    },
    [userId],
  );

  return { profile, loading, refetch, updateProfile };
}
