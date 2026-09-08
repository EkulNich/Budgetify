import { useCallback } from "react";

import { supabase } from "@/lib/supabase";

export type NudgeDirection = "remind_to_pay" | "heads_up";

export type NudgeInput = {
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  direction: NudgeDirection;
  amount: number;
  currency: string;
};

/** Records a nudge and asks the send-nudge edge function to push-notify the recipient. */
export function useNudges() {
  const sendNudge = useCallback(async (input: NudgeInput) => {
    const { error: insertError } = await supabase.from("nudges").insert({
      from_user: input.fromUserId,
      to_user: input.toUserId,
      direction: input.direction,
      amount: input.amount,
      currency: input.currency,
    });
    if (insertError) {
      console.error("Failed to record nudge:", insertError.message);
      throw insertError;
    }

    const { error: invokeError } = await supabase.functions.invoke("send-nudge", {
      body: {
        toUserId: input.toUserId,
        fromUsername: input.fromUsername,
        direction: input.direction,
        amount: input.amount,
        currency: input.currency,
      },
    });
    if (invokeError) {
      // The nudge is still recorded even if the push couldn't be delivered
      // (e.g. the recipient hasn't registered a device yet) — not the
      // sender's problem to solve, so this doesn't throw.
      console.error("Failed to deliver nudge push notification:", invokeError.message);
    }
  }, []);

  return { sendNudge };
}
