import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { answerPesoChat } from "../_shared/perakitaAi.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Sign in required" }, 401, origin);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return jsonResponse({ error: "Sign in required" }, 401, origin);

    const { message, snapshot } = await req.json();
    const reply = answerPesoChat(String(message ?? ""), snapshot);
    return jsonResponse({ reply }, 200, origin);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Failed" }, 500, origin);
  }
});
