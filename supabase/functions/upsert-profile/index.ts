import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PrivyClient } from "https://esm.sh/@privy-io/server-auth@1";

const PRIVY_APP_ID     = Deno.env.get("PRIVY_APP_ID")!;
const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const privy   = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // Verify Privy JWT
    const claims = await privy.verifyAuthToken(accessToken);
    const privyUserId = claims.userId;

    // Get full user record from Privy
    const privyUser = await privy.getUser(privyUserId);

    // Extract wallet address (embedded wallet is always first)
    const walletAddress =
      privyUser.wallet?.address ??
      privyUser.linkedAccounts.find((a) => a.type === "wallet")?.address;

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "No wallet found for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine auth method and identifier
    let authMethod = "unknown";
    let authIdentifier = "";

    if (privyUser.email) {
      authMethod     = "email";
      authIdentifier = privyUser.email.address;
    } else if (privyUser.google) {
      authMethod     = "google";
      authIdentifier = privyUser.google.email ?? privyUser.google.name ?? "";
    } else if (privyUser.apple) {
      authMethod     = "apple";
      authIdentifier = privyUser.apple.email ?? "";
    } else if (privyUser.farcaster) {
      authMethod     = "farcaster";
      authIdentifier = privyUser.farcaster.username ?? "";
    }

    // Parse optional profile fields from body
    let displayName: string | undefined;
    let bio: string | undefined;

    try {
      const body = await req.json().catch(() => ({}));
      displayName = body.displayName;
      bio         = body.bio;
    } catch {
      // body is optional
    }

    // Upsert profile
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          wallet_address:  walletAddress.toLowerCase(),
          privy_user_id:   privyUserId,
          auth_method:     authMethod,
          auth_identifier: authIdentifier,
          ...(displayName !== undefined && { display_name: displayName }),
          ...(bio !== undefined && { bio }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" }
      )
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ profile: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("upsert-profile error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
