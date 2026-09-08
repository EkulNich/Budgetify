import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { toUserId, fromUsername, direction, amount, currency } = await req.json();

  if (!toUserId || !fromUsername || !direction) {
    return new Response(
      JSON.stringify({ error: "toUserId, fromUsername, and direction are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Supabase service credentials are not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokenRow } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", toUserId)
    .maybeSingle();

  if (!tokenRow?.expo_push_token) {
    return new Response(JSON.stringify({ sent: false, reason: "No push token on file" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const amountText =
    typeof amount === "number" && currency ? ` (${currency} ${amount.toFixed(2)})` : "";
  const title = direction === "remind_to_pay" ? "Payment Reminder" : "Heads Up";
  const body =
    direction === "remind_to_pay"
      ? `${fromUsername} nudged you to settle up${amountText}`
      : `${fromUsername} says they'll pay you back soon${amountText}`;

  const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: tokenRow.expo_push_token,
      title,
      body,
      sound: "default",
    }),
  });

  if (!pushResponse.ok) {
    const errorText = await pushResponse.text();
    console.error("Expo push error:", errorText);
    return new Response(JSON.stringify({ error: "Failed to send push notification" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
