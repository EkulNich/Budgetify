import { supabase } from "./supabase";

/**
 * Deletes the current user's account. Personal data (expenses, friendships,
 * nudges, pool membership) is removed outright; anything shared with others
 * (pool expenses they added, settlements) is left untouched — their profile
 * is anonymized in place rather than deleted, so those references stay valid
 * and other people's history/balances stay correct. Signing back in with the
 * same Google account afterward is allowed and just starts a fresh, blank
 * profile — this isn't a ban, only a data wipe.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    console.error("Failed to delete account:", error.message);
    throw error;
  }
  await supabase.auth.signOut();
}
