import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

/** Creates the user's `profiles` row on first sign-in, if one doesn't already exist. */
export async function ensureProfileRow(user: User) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) return;

  // Prefer the Google profile name; fall back to the email handle, then a generic default.
  const username =
    user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "user";

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    monthly_salary: 0,
    monthly_budget: 0,
  });

  if (error) {
    console.error("Failed to create profile row:", error.message);
    throw error;
  }
}
