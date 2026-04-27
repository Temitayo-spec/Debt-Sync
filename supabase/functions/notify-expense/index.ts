import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const { groupId, groupName, expenseTitle, paidBy, amount, excludeUserId } =
    await req.json();

  // Get push tokens of all group members except the one who added the expense
  const { data: members, error } = await supabase
    .from("group_members")
    .select("user_id, profiles(push_token)")
    .eq("group_id", groupId)
    .neq("user_id", excludeUserId);

  if (error || !members?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const tokens: string[] = members
    .flatMap((m: any) => (m.profiles?.push_token ? [m.profiles.push_token] : []));

  if (!tokens.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const messages = tokens.map((to) => ({
    to,
    title: `New expense in ${groupName}`,
    body: `${paidBy} added "${expenseTitle}" — ₦${Number(amount).toLocaleString()}`,
    data: { groupId },
    sound: "default",
  }));

  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await expoRes.json();
  return new Response(JSON.stringify({ sent: tokens.length, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
