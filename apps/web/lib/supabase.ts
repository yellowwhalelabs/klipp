import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NOTE: clients are created lazily (on first use) rather than at module-eval
// time. Next.js "collect page data" runs route modules during the build, where
// these env vars may be absent — eager createClient(undefined, …) would throw
// "supabaseUrl is required" and fail the build. Lazy init defers that to
// runtime, when the env vars are present.

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `[supabase] Missing required env var ${name}. Set it in your Vercel project (Settings → Environment Variables) and in .env.local for local dev.`
    );
  }
  return v;
}

// ── Client-side (anon key) ────────────────────────────────────────────────────
// Lazy singleton exposed via a Proxy so existing `supabase.from(...)` call sites
// keep working unchanged, but construction happens on first property access.
let _anonClient: SupabaseClient | null = null;
function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(
      readEnv("NEXT_PUBLIC_SUPABASE_URL"),
      readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
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
// Already lazy — only call this inside route handlers / server components.
export function createServiceClient(): SupabaseClient {
  return createClient(
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}
