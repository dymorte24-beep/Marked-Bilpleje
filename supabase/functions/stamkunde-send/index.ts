// Stamkunde-appen: sender planlagte SMS via GatewayAPI (EU).
// Kaldes hvert 5. minut af pg_cron (header x-cron-secret) og fra appen ved "Send test-SMS" (brugerens login).
//
// Hemmeligheder (Supabase → Edge Functions → Secrets):
//   GATEWAYAPI_TOKEN  – API-nøgle fra app.gatewayapi.eu (Daniel sætter den selv ind)
// Fælles kode med pg_cron ligger i Supabase Vault ("stamkunde_cron_secret") og hentes via RPC sk_cron_secret().
// Uden GATEWAYAPI_TOKEN sendes intet: beskeder markeres "simuleret", så man kan se hvad der VILLE være sendt.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { hentIcs, parseIcs, udtraek } from "./kalender.ts";

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

// Annoncen: bilplejerens tekst + afmeld-link (kræves ved markedsføring)
export function annonceTekst(tekst: string, token: string) {
  const ren = tekst.replace(/\s*Afmeld:\s*\S+\s*$/i, "").trim();
  return `${ren} Afmeld: findbilplejere.dk/stop?k=${token}`;
}
// Kort link på vores eget domæne (godkendt hos GatewayAPI). findbilplejere.dk/g/<kode> sender videre til Google (funktionen "anmeld").
const kortLink = (shopId: string) => `https://findbilplejere.dk/g/${String(shopId).slice(0, 8)}`;
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
          const tekst = takTekst(k.navn, firma, kortLink(b.shop_id));
          upd = { tekst, ...(await lever(ind, k.navn, k.telefon, tekst, b.id)) };
        }
      } else if (b.type === "paamindelse") {
        const { count } = await admin.from("sk_beskeder").select("id", { count: "exact", head: true })
          .eq("kunde_id", k.id).eq("type", "paamindelse").in("status", ["sendt", "test_sendt"])
          .gte("sendt_at", new Date(Date.now() - 30 * 864e5).toISOString());
        // Påmindelser går til alle kunder (der ikke er stoppet). Afmeld-linket er altid med.
        if ((count ?? 0) > 0) upd = { status: "sprunget_over", fejl: "Højst 1 påmindelse pr. måned" };
        else {
          const tekst = paamindTekst(k.navn, firma, job?.behandling ?? "behandling", job?.udfoert_at ?? b.oprettet_at, shop?.phone ?? null, k.afmeld_token);
          upd = { tekst, ...(await lever(ind, k.navn, k.telefon, tekst, b.id)) };
        }
      } else if (b.type === "annonce") {
        // Bilplejerens egen annonce: kun til kunder, der har sagt ja tak
        if (!k.ja_tak) upd = { status: "sprunget_over", fejl: "Kunden har ikke sagt ja tak til annoncer" };
        else if (Date.now() - new Date(b.planlagt_til).getTime() > 2 * 864e5) upd = { status: "sprunget_over", fejl: "For gammel (over 2 døgn)" };
        else if (!String(b.tekst || "").trim()) upd = { status: "fejl", fejl: "Annoncen har ingen tekst" };
        else {
          const tekst = annonceTekst(String(b.tekst), k.afmeld_token);
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


// ---------- Kalender ----------
// Henter bilplejerens kalender, gemmer aftalerne (14 dage frem, 2 dage tilbage) og laver job af aftaler der er slut.
const kun8 = (t: string | null) => (t && /^[2-9]\d{7}$/.test(t) ? t : null);
async function synkShop(ind: any) {
  const nu = Date.now();
  const { data: shop } = await admin.from("shops").select("services").eq("id", ind.shop_id).maybeSingle();
  let aftaler;
  try {
    aftaler = parseIcs(await hentIcs(ind.kalender_url));
  } catch (e) {
    await admin.from("sk_indstillinger").update({ kalender_sidst: new Date().toISOString(), kalender_fejl: String((e as Error).message ?? e).slice(0, 300) }).eq("shop_id", ind.shop_id);
    return { fejl: String((e as Error).message ?? e) };
  }
  const fra = nu - 2 * 864e5, til = nu + 14 * 864e5;
  const iVindue = aftaler.filter((a) => a.slut.getTime() >= fra && a.start.getTime() <= til);
  const { data: gamle } = await admin.from("sk_aftaler").select("*").eq("shop_id", ind.shop_id).gte("slut_at", new Date(fra).toISOString());
  const kendt = new Map((gamle ?? []).map((g: any) => [g.uid, g]));
  const set = new Set<string>();
  for (const a of iVindue) {
    set.add(a.uid);
    const g: any = kendt.get(a.uid);
    if (g && ["job", "sprunget_over"].includes(g.status)) continue;
    const f = udtraek(a, shop?.services ?? []);
    const tlf = g?.rettet ? g.telefon : kun8(f.telefon);
    const raekke: Record<string, unknown> = {
      shop_id: ind.shop_id, uid: a.uid, start_at: a.start.toISOString(), slut_at: a.slut.toISOString(), titel: a.titel.slice(0, 200),
      status: a.aflyst ? "aflyst" : tlf ? "venter" : "mangler_nummer", opdateret_at: new Date().toISOString(),
    };
    if (!g?.rettet) Object.assign(raekke, { navn: f.navn || null, telefon: tlf, behandling: f.behandling });
    if (g) await admin.from("sk_aftaler").update(raekke).eq("id", g.id);
    else await admin.from("sk_aftaler").insert(raekke);
  }
  // Aftaler der er slettet i kalenderen, før de startede
  for (const g of gamle ?? []) {
    if (!set.has(g.uid) && ["venter", "mangler_nummer"].includes(g.status) && new Date(g.start_at).getTime() > nu)
      await admin.from("sk_aftaler").update({ status: "aflyst", opdateret_at: new Date().toISOString() }).eq("id", g.id);
  }
  const job = await lavJobAfAftaler(ind);
  await admin.from("sk_indstillinger").update({ kalender_sidst: new Date().toISOString(), kalender_fejl: null }).eq("shop_id", ind.shop_id);
  return { aftaler: iVindue.length, job };
}

// Aftaler med nummer, der er slut (og sluttede efter kalenderen blev koblet på), bliver til job => tak-SMS planlægges
async function lavJobAfAftaler(ind: any) {
  const nu = new Date().toISOString();
  const { data: klar } = await admin.from("sk_aftaler").select("*").eq("shop_id", ind.shop_id).eq("status", "venter")
    .lte("slut_at", nu).gte("slut_at", ind.kalender_koblet_at ?? nu);
  let n = 0;
  for (const a of klar ?? []) {
    if (Date.now() - new Date(a.slut_at).getTime() > 2 * 864e5) { await admin.from("sk_aftaler").update({ status: "sprunget_over" }).eq("id", a.id); continue; }
    const tlf = kun8(a.telefon);
    if (!tlf) { await admin.from("sk_aftaler").update({ status: "mangler_nummer" }).eq("id", a.id); continue; }
    let { data: k } = await admin.from("sk_kunder").select("id").eq("shop_id", ind.shop_id).eq("telefon", tlf).maybeSingle();
    if (!k) {
      const r = await admin.from("sk_kunder").insert({ shop_id: ind.shop_id, navn: a.navn || "Kunde", telefon: tlf }).select("id").single();
      if (r.error) { await admin.from("sk_aftaler").update({ status: "mangler_nummer" }).eq("id", a.id); continue; }
      k = r.data;
    }
    const j = await admin.from("sk_job").insert({ shop_id: ind.shop_id, kunde_id: k!.id, behandling: a.behandling || "Bilpleje", udfoert_at: a.slut_at, kilde: "kalender", aftale_id: a.id }).select("id").single();
    if (j.error) continue;
    await admin.from("sk_aftaler").update({ status: "job", job_id: j.data.id, opdateret_at: new Date().toISOString() }).eq("id", a.id);
    n++;
  }
  return n;
}

async function synkAlle() {
  const graense = new Date(Date.now() - 9 * 60000).toISOString();
  const { data } = await admin.from("sk_indstillinger").select("*").not("kalender_url", "is", null)
    .or(`kalender_sidst.is.null,kalender_sidst.lt.${graense}`).limit(25);
  let n = 0;
  for (const ind of data ?? []) { try { const r: any = await synkShop(ind); n += r.job ?? 0; } catch (_) { /* næste gang */ } }
  return n;
}

// Fra appen: tjek et kalender-link før det gemmes (viser hvad vi kan læse)
async function kalenderTest(url: string, services: string[]) {
  const nu = Date.now();
  const alle = parseIcs(await hentIcs(url)).filter((a) => !a.aflyst && a.slut.getTime() >= nu - 7 * 864e5 && a.start.getTime() <= nu + 14 * 864e5)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const ud = alle.map((a) => ({ start: a.start.toISOString(), titel: a.titel.slice(0, 80), ...udtraek(a, services) }));
  return { antal: ud.length, med_nummer: ud.filter((x) => kun8(x.telefon)).length, eksempler: ud.slice(0, 8) };
}
async function ejerAf(req: Request, shopId: string) {
  const bruger = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data } = await bruger.from("shops").select("id, services").eq("id", shopId).maybeSingle();
  const { data: { user } } = await bruger.auth.getUser();
  if (!data || !user) return null;
  const { data: ok } = await bruger.rpc("sk_ejer", { p_shop: shopId });
  return ok ? data : null;
}

// "Send test-SMS" fra appen: sender en eksempel-tak-SMS til bilplejerens testnummer
async function testSms(req: Request, shopId: string) {
  const bruger = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: ind } = await bruger.from("sk_indstillinger").select("*").eq("shop_id", shopId).maybeSingle();
  if (!ind) return json({ fejl: "Ingen adgang eller indstillinger ikke gemt" }, 403);
  if (!ind.testnummer) return json({ fejl: "Skriv dit eget mobilnummer under Testnummer først" }, 400);
  const { data: shop } = await admin.from("shops").select("name").eq("id", shopId).maybeSingle();
  const tekst = takTekst("Mette", shop?.name ?? "os", ind.google_link ? kortLink(shopId) : "https://g.page/r/eksempel/review");
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
    const body = await req.json().catch(() => ({}));
    if (hdr) {
      const hemmelig = await hentCronSecret();
      if (hemmelig && hdr === hemmelig) {
        // Driftstest fra databasen: send én fast SMS til et nummer (bruges af admin, ingen data ændres)
        if (body?.test_til && /^[2-9][0-9]{7}$/.test(String(body.test_til))) {
          if (!TOKEN) return json({ status: "simuleret", fejl: "SMS-nøgle ikke sat op endnu" });
          const ref = await sendSms("Bilpleje", String(body.test_til), "Test fra FindBilplejere: SMS-motoren til Stamkunde-appen virker.", "drifttest");
          return json({ status: "sendt", gateway_ref: ref });
        }
        const kalender_job = await synkAlle().catch(() => 0);
        return json({ ...(await koer()), kalender_job });
      }
    }
    if (body?.action === "test" && body?.shop_id && req.headers.get("Authorization")) return await testSms(req, body.shop_id);
    if ((body?.action === "kalender_test" || body?.action === "kalender_synk") && body?.shop_id && req.headers.get("Authorization")) {
      const shop = await ejerAf(req, body.shop_id);
      if (!shop) return json({ fejl: "Ingen adgang" }, 403);
      try {
        if (body.action === "kalender_test") return json(await kalenderTest(String(body.url || ""), shop.services ?? []));
        const { data: ind } = await admin.from("sk_indstillinger").select("*").eq("shop_id", body.shop_id).maybeSingle();
        if (!ind?.kalender_url) return json({ fejl: "Ingen kalender koblet på" }, 400);
        return json(await synkShop(ind));
      } catch (e) { return json({ fejl: String((e as Error).message ?? e) }, 400); }
    }
    return json({ fejl: "Ikke tilladt" }, 401);
  } catch (e) {
    return json({ fejl: String((e as Error).message ?? e) }, 500);
  }
});
