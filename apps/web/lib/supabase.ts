import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Env vars are referenced STATICALLY (process.env.NEXT_PUBLIC_FOO, never
// process.env[name]) so that Next.js inlines the NEXT_PUBLIC_* values into the
// client bundle. A dynamic lookup is never inlined and reads as `undefined` in
// the browser — which is why the anon client failed at runtime ("supabaseUrl is
// required") even though the var was set in Vercel.
//
// Clients are still created LAZILY (Proxy / function), not at module-eval time,
// so the build's "collect page data" pass doesn't construct a client before the
// vars exist.

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[supabase] Missing required env var ${name}. Set it in Vercel ` +
        `(Settings → Environment Variables) and in .env.local for local dev.`
    );
  }
  return value;
}

// ── Client-side (anon key) ────────────────────────────────────────────────────
// Lazy singleton exposed via a Proxy so existing `supabase.from(...)` call sites
// keep working unchanged, but construction happens on first property access.
let _anonClient: SupabaseClient | null = null;
function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(
      required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
      required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }
  return _anonClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAnonClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// ── Server-side (service role) ────────────────────────────────────────────────
// Only call this inside route handlers / server components. SUPABASE_SERVICE_
// ROLE_KEY is NOT NEXT_PUBLIC and is read at runtime on the server.
export function createServiceClient(): SupabaseClient {
  return createClient(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}
