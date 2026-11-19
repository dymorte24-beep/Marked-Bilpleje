// Videresender kunden fra SMS-linket findbilplejere.dk/g/<kode> til bilplejerens Google-anmeldelse.
// <kode> = de første 8 tegn af butikkens id. Netlify (_redirects) sender /g/* hertil.
// Hvorfor: GatewayAPI tillader kun godkendte links i SMS. Med vores eget domæne virker alle Google-links.
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const FORSIDE = "https://findbilplejere.dk/";
const til = (url: string) => new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  try {
    const kode = (new URL(req.url).pathname.split("/").filter(Boolean).pop() || "").toLowerCase();
    if (!/^[0-9a-f]{8}$/.test(kode)) return til(FORSIDE);
    const { data } = await admin.from("sk_indstillinger").select("shop_id, google_link").not("google_link", "is", null);
    const r = (data ?? []).find((x: any) => String(x.shop_id).startsWith(kode));
    const link = String(r?.google_link || "");
    return til(/^https:\/\/[^\s]+$/.test(link) ? link : FORSIDE);
  } catch (_) {
    return til(FORSIDE);
  }
});
