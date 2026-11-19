// Stamkunde-appen: sender planlagte SMS via GatewayAPI (EU).
// Kaldes hvert 5. minut af pg_cron (header x-cron-secret) og fra appen ved "Send test-SMS" (brugerens login).
//
// Hemmeligheder (Supabase → Edge Functions → Secrets):
//   GATEWAYAPI_TOKEN  – API-nøgle fra app.gatewayapi.eu (Daniel sætter den selv ind)
// Fælles kode med pg_cron ligger i Supabase Vault ("stamkunde_cron_secret") og hentes via RPC sk_cron_secret().
// Uden GATEWAYAPI_TOKEN sendes intet: beskeder markeres "simuleret", så man kan se hvad der VILLE være sendt.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const TOKEN = Deno.env.get("GATEWAYAPI_TOKEN") ?? "";
const GATEWAY = "https://messaging.gatewayapi.eu/mobile/single";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
let cronSecret: string | null = null;
async function hentCronSecret() {
  if (cronSecret === null) { const { data } = await admin.rpc("sk_cron_secret"); cronSecret = data ?? ""; }
  return cronSecret;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const fornavn = (navn: string) => (navn || "").trim().split(/\s+/)[0] || "";

function tidSiden(fra: string): string {
  const m = Math.round((Date.now() - new Date(fra).getTime()) / (30.44 * 864e5));
  if (m >= 11 && m <= 13) return "et år";
  if (m >= 23 && m <= 25) return "to år";
  return `${m} måneder`;
}

export function takTekst(navn: string, firma: string, link: string) {
  return `Hej ${fornavn(navn)}, tak fordi du valgte ${firma}. Hvis du er glad for resultatet, vil vi blive rigtig glade for en anmeldelse på Google. Det tager 30 sekunder: ${link} Mvh ${firma}`;
}
export function paamindTekst(navn: string, firma: string, behandling: string, udfoert: string, tlf: string | null, token: string) {
  const kontakt = tlf ? `Ring eller skriv på ${tlf}` : "Skriv til os";
  return `Hej ${fornavn(navn)}, nu er det ${tidSiden(udfoert)} siden din ${behandling.toLowerCase()} hos ${firma}. Skal vi finde en ny tid? ${kontakt}. Afmeld: findbilplejere.dk/stop?k=${token}`;
}

async function sendSms(afsender: string, nummer8: string, tekst: string, ref: string) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Token ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: afsender, message: tekst, recipient: Number("45" + nummer8), reference: ref }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`GatewayAPI ${res.status}: ${body.slice(0, 300)}`);
  try { return String(JSON.parse(body).msg_id ?? ""); } catch { return ""; }
}

// Sender én besked (eller simulerer den) og returnerer ny status
async function lever(ind: any, kundeNavn: string, tilNummer: string, tekst: string, ref: string) {
  let modtager = tilNummer;
  let besked = tekst;
  if (ind.testtilstand) {
    if (!ind.testnummer) return { status: "simuleret", sendt_til: null, fejl: "Testtilstand uden testnummer" };
    modtager = ind.testnummer;
    besked = `TEST (til ${fornavn(kundeNavn) || "kunde"}): ${tekst}`;
  }
  if (!TOKEN) return { status: "simuleret", sendt_til: modtager, fejl: "SMS-nøgle ikke sat op endnu" };
  const ref_id = await sendSms(ind.afsender || "Bilpleje", modtager, besked, ref);
  return { status: ind.testtilstand ? "test_sendt" : "sendt", sendt_til: modtager, gateway_ref: ref_id, fejl: null };
}

async function koer() {
  // Tag op til 50 forfaldne beskeder og markér dem "sender", så de aldrig sendes to gange
  const { data: claimed, error } = await admin.rpc("sk_tag_forfaldne", { p_max: 50 });
  if (error) throw error;
  const resultat: Record<string, number> = {};
  for (const b of claimed ?? []) {
    let upd: Record<string, unknown> = {};
    try {
      const [{ data: ind }, { data: k }, { data: shop }, { data: job }] = await Promise.all([
        admin.from("sk_indstillinger").select("*").eq("shop_id", b.shop_id).maybeSingle(),
        admin.from("sk_kunder").select("*").eq("id", b.kunde_id).maybeSingle(),
        admin.from("shops").select("name, phone").eq("id", b.shop_id).maybeSingle(),
        b.job_id ? admin.from("sk_job").select("*").eq("id", b.job_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const firma = shop?.name ?? "os";
      if (!ind || !ind.aktiv) upd = { status: "sprunget_over", fejl: "SMS er slået fra i appen" };
      else if (!k) upd = { status: "annulleret", fejl: "Kunden findes ikke" };
      else if (k.stop) upd = { status: "annulleret", fejl: "Kunden er stoppet" };
      else if (b.type === "tak") {
        if (Date.now() - new Date(b.planlagt_til).getTime() > 2 * 864e5) upd = { status: "sprunget_over", fejl: "For gammel (over 2 døgn)" };
        else if (!ind.google_link) upd = { status: "fejl", fejl: "Mangler link til Google-anmeldelse" };
        else {
          const tekst = takTekst(k.navn, firma, ind.google_link);
          upd = { tekst, ...(await lever(ind, k.navn, k.telefon, tekst, b.id)) };
        }
      } else if (b.type === "paamindelse") {
        const { count } = await admin.from("sk_beskeder").select("id", { count: "exact", head: true })
          .eq("kunde_id", k.id).eq("type", "paamindelse").in("status", ["sendt", "test_sendt"])
          .gte("sendt_at", new Date(Date.now() - 30 * 864e5).toISOString());
        if (!k.ja_tak) upd = { status: "sprunget_over", fejl: "Kunden har ikke sagt ja tak til påmindelser" };
        else if ((count ?? 0) > 0) upd = { status: "sprunget_over", fejl: "Højst 1 påmindelse pr. måned" };
        else {
          const tekst = paamindTekst(k.navn, firma, job?.behandling ?? "behandling", job?.udfoert_at ?? b.oprettet_at, shop?.phone ?? null, k.afmeld_token);
          upd = { tekst, ...(await lever(ind, k.navn, k.telefon, tekst, b.id)) };
        }
      } else upd = { status: "sprunget_over", fejl: "Ukendt type" };
    } catch (e) {
      upd = { status: "fejl", fejl: String((e as Error).message ?? e).slice(0, 500) };
    }
    if (["sendt", "test_sendt", "simuleret"].includes(String(upd.status))) upd.sendt_at = new Date().toISOString();
    await admin.from("sk_beskeder").update(upd).eq("id", b.id);
    resultat[String(upd.status)] = (resultat[String(upd.status)] ?? 0) + 1;
  }
  return resultat;
}

// "Send test-SMS" fra appen: sender en eksempel-tak-SMS til bilplejerens testnummer
async function testSms(req: Request, shopId: string) {
  const bruger = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: ind } = await bruger.from("sk_indstillinger").select("*").eq("shop_id", shopId).maybeSingle();
  if (!ind) return json({ fejl: "Ingen adgang eller indstillinger ikke gemt" }, 403);
  if (!ind.testnummer) return json({ fejl: "Skriv dit eget mobilnummer under Testnummer først" }, 400);
  const { data: shop } = await admin.from("shops").select("name").eq("id", shopId).maybeSingle();
  const tekst = takTekst("Mette", shop?.name ?? "os", ind.google_link || "https://g.page/r/eksempel/review");
  const { data: rec } = await admin.from("sk_beskeder").insert({
    shop_id: shopId, type: "test", planlagt_til: new Date().toISOString(), status: "sender", tekst,
  }).select("id").single();
  let upd: Record<string, unknown>;
  try {
    upd = await lever({ ...ind, testtilstand: true }, "Mette", ind.testnummer, tekst, rec!.id);
  } catch (e) {
    upd = { status: "fejl", fejl: String((e as Error).message ?? e).slice(0, 500) };
  }
  upd.sendt_at = new Date().toISOString();
  await admin.from("sk_beskeder").update(upd).eq("id", rec!.id);
  return json(upd, upd.status === "fejl" ? 502 : 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const hdr = req.headers.get("x-cron-secret");
    if (hdr) { const hemmelig = await hentCronSecret(); if (hemmelig && hdr === hemmelig) return json(await koer()); }
    const body = await req.json().catch(() => ({}));
    if (body?.action === "test" && body?.shop_id && req.headers.get("Authorization")) return await testSms(req, body.shop_id);
    return json({ fejl: "Ikke tilladt" }, 401);
  } catch (e) {
    return json({ fejl: String((e as Error).message ?? e) }, 500);
  }
});
