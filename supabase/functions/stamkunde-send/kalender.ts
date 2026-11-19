// Kalender-kobling til Stamkunde-appen: læser bilplejerens iCal/ICS-link og finder kunde, mobilnummer og behandling.
// Virker med Google Kalender ("hemmelig adresse i iCal-format"), iPhone/iCloud (offentlig kalender-link),
// Outlook ("udgiv kalender", ICS-link) og de fleste bookingsystemer (iCal-eksport).

export type Aftale = { uid: string; start: Date; slut: Date; titel: string; beskrivelse: string; aflyst: boolean };
export type Fund = { navn: string; telefon: string | null; behandling: string };

const TZ = "Europe/Copenhagen";

// ---------- hent ----------
export function rensUrl(raw: string): string {
  let u = String(raw || "").trim();
  if (u.startsWith("webcal://")) u = "https://" + u.slice(9);
  const url = new URL(u); // kaster ved ugyldigt link
  if (url.protocol !== "https:") throw new Error("Linket skal starte med https:// eller webcal://");
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":") || h.endsWith("supabase.co"))
    throw new Error("Det link kan ikke bruges");
  return url.toString();
}

export async function hentIcs(raw: string): Promise<string> {
  const res = await fetch(rensUrl(raw), { headers: { "User-Agent": "FindBilplejere-Stamkunder/1.0", Accept: "text/calendar,*/*" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(res.status === 404 || res.status === 403 ? "Kalenderen kunne ikke åbnes (linket er forkert eller ikke delt)" : `Kalenderen svarede ${res.status}`);
  const tekst = await res.text();
  if (tekst.length > 8_000_000) throw new Error("Kalenderen er for stor");
  if (!tekst.includes("BEGIN:VCALENDAR")) throw new Error("Linket er ikke en kalender (iCal/ICS)");
  return tekst;
}

// ---------- parse ----------
function tzOffsetMs(utcMs: number, tz: string): number {
  const d = new Date(utcMs);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d).filter((x) => x.type !== "literal").map((x) => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utcMs;
}
function lokalTilUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  let zone = TZ;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); zone = tz; } catch { /* fx Windows-navne fra Outlook: brug dansk tid */ }
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = guess - tzOffsetMs(guess, zone);
  t = guess - tzOffsetMs(t, zone);
  return new Date(t);
}
function parseDato(v: string, params: Record<string, string>): Date | null {
  const m = v.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return lokalTilUtc(+y, +mo, +d, 0, 0, 0, TZ); // heldagsaftale
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)));
  return lokalTilUtc(+y, +mo, +d, +h, +mi, +(s || 0), params.TZID || TZ);
}
const afkod = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

export function parseIcs(ics: string): Aftale[] {
  const linjer = ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const ud: Aftale[] = [];
  let e: Record<string, { v: string; p: Record<string, string> }> | null = null;
  let dybde = 0;
  for (const l of linjer) {
    if (l === "BEGIN:VEVENT") { e = {}; dybde = 0; continue; }
    if (!e) continue;
    if (l.startsWith("BEGIN:")) { dybde++; continue; }   // fx VALARM inde i aftalen
    if (l.startsWith("END:") && l !== "END:VEVENT") { dybde--; continue; }
    if (l === "END:VEVENT") {
      const start = e.DTSTART && parseDato(e.DTSTART.v, e.DTSTART.p);
      let slut = e.DTEND && parseDato(e.DTEND.v, e.DTEND.p);
      if (start && !slut) {
        const dur = e.DURATION?.v.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
        const ms = dur ? ((+(dur[1] || 0) * 24 + +(dur[2] || 0)) * 60 + +(dur[3] || 0)) * 60000 : 3600000;
        slut = new Date(start.getTime() + (ms || 3600000));
      }
      if (start && slut && e.UID) {
        ud.push({
          uid: e.UID.v + "|" + start.toISOString(),
          start, slut,
          titel: afkod(e.SUMMARY?.v || "").trim(),
          beskrivelse: [afkod(e.DESCRIPTION?.v || ""), afkod(e.LOCATION?.v || "")].filter(Boolean).join("\n").trim(),
          aflyst: (e.STATUS?.v || "").toUpperCase() === "CANCELLED",
        });
      }
      e = null; continue;
    }
    if (dybde > 0) continue;
    const i = l.indexOf(":"); if (i < 1) continue;
    const [navn, ...ps] = l.slice(0, i).split(";");
    const p: Record<string, string> = {};
    for (const x of ps) { const [k, v] = x.split("="); if (k && v) p[k.toUpperCase()] = v.replace(/^"|"$/g, ""); }
    const key = navn.toUpperCase();
    if (!e[key]) e[key] = { v: l.slice(i + 1), p };
  }
  return ud;
}

// ---------- find kunde, nummer og behandling ----------
const ORD = ["coating", "keramisk", "polering", "polish", "voks", "lakforsegling", "lakrens", "rens", "indvendig", "udvendig", "klargøring", "klargoring",
  "vask", "håndvask", "detail", "detailing", "ppf", "folie", "foliering", "solfilm", "ozon", "motorvask", "fælgrens", "læder", "sæderens", "rudecoating", "glascoating", "stenslag", "bilpleje", "pakke"];
const TLF = /(?:\+45|0045)?[\s.-]*([2-9](?:[\s.-]?\d){7})(?![\d])/;

function findTlf(t: string): string | null {
  const m = t.match(TLF);
  return m ? m[1].replace(/\D/g, "") : null;
}
function felt(tekst: string, navne: string[]): string {
  for (const l of tekst.split("\n")) {
    const m = l.match(/^\s*([A-Za-zæøåÆØÅ ]{2,20})\s*[:=]\s*(.+)$/);
    if (m && navne.includes(m[1].trim().toLowerCase())) return m[2].trim();
  }
  return "";
}
const erBeh = (s: string, ekstra: string[]) => { const l = s.toLowerCase(); return [...ORD, ...ekstra].some((o) => o && l.includes(o)); };

export function udtraek(a: { titel: string; beskrivelse: string }, ydelser: string[] = []): Fund {
  const ekstra = ydelser.map((y) => y.toLowerCase()).filter((y) => y.length > 2);
  const telefon = findTlf(felt(a.beskrivelse, ["telefon", "tlf", "mobil", "mobilnummer", "phone", "telephone", "mobile", "nummer"])) || findTlf(a.titel) || findTlf(a.beskrivelse);
  let navn = felt(a.beskrivelse, ["navn", "name", "kunde", "customer", "kundenavn", "fulde navn", "full name"]);
  let behandling = felt(a.beskrivelse, ["ydelse", "ydelser", "service", "services", "behandling", "behandlinger", "produkt", "pakke"]);
  // Titlen: fjern nummeret og del ved - | , : / ( )
  const titel = a.titel.replace(TLF, " ").replace(/\b(tlf|mobil|telefon)\.?\b/gi, " ").trim();
  const dele = titel.split(/\s[-–—|]\s|[|,:/()]|\s-\s?/).map((x) => x.trim()).filter(Boolean);
  if (!behandling) behandling = dele.filter((d) => erBeh(d, ekstra)).join(", ");
  if (!navn) {
    const rest = dele.filter((d) => !erBeh(d, ekstra));
    if (rest.length) navn = rest[0];
    else if (dele.length === 1) {
      // fx "Peter indvendig rens": navnet er ordene før den første behandling
      const ord = dele[0].split(/\s+/);
      const i = ord.findIndex((w) => erBeh(w, ekstra));
      navn = ord.slice(0, Math.max(0, i)).join(" ");
      behandling = ord.slice(Math.max(0, i)).join(" ");
    }
  }
  if (!behandling) behandling = titel || "Bilpleje";
  navn = navn.replace(/[^\p{L}\p{M}\s.'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!/\p{L}{2}/u.test(navn)) navn = "";
  return { navn, telefon, behandling: behandling.replace(/\s+/g, " ").trim().slice(0, 80) };
}
