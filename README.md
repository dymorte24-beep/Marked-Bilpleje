# bilpleje.dk

Markedsplads-side der forbinder private kunder med bilpleje-butikker i Danmark. Gratis for kunder, butikker betaler for listing/topplacering.

## Struktur

```
bilpleje-dk/
├── index.html        # al markup
├── css/style.css      # alt styling
├── js/main.js         # slider, søgefilter, lead-form submit
└── netlify.toml       # Netlify build/deploy config
```

Ren HTML/CSS/JS, intet build-step. Demo-butikkerne i søgesektionen er stadig hardcoded dummy-data i `index.html` (`.card`-elementer) — skift til rigtige data senere via et CMS eller et lille API, ingen ombygning af resten af siden nødvendig.

## Kør lokalt

Åbn `index.html` direkte i browseren, eller kør en lokal server (så relative paths og evt. fremtidige fetch-kald opfører sig som i prod):

```bash
npx serve .
```

## Lead-formular → Netlify Forms

Formularen under "For bilpleje-butikker" er koblet til **Netlify Forms** — ingen backend-kode nødvendig:

- `data-netlify="true"` på `<form>` gør at Netlify's build-bot opsnapper formularen ved deploy.
- `netlify-honeypot="bot-field"` + det skjulte `bot-field`-input er spam-beskyttelse.
- `js/main.js` sender formularen via `fetch` til Netlify, så brugeren ser en "Tak!"-besked uden sideskift.

**Efter første deploy** skal du selv aktivere mail-notifikationer, ellers ligger leads kun i Netlify's dashboard:

1. Netlify → dit site → **Forms** → bekræft at `butik-lead` vises i formular-listen (den dukker først op efter første deploy).
2. **Site configuration → Forms → Form notifications → Add notification → Email notification**.
3. Sæt notifikations-mailen til den adresse du vil modtage henvendelser på.

Gratis Netlify-plan inkluderer 100 formular-indsendelser/måned.

## Deploy til Netlify

To muligheder:

**A. Drag-and-drop (hurtigst, ingen git nødvendig)**
Gå til [app.netlify.com/drop](https://app.netlify.com/drop) og træk hele `bilpleje-dk`-mappen ind. Netlify hoster den med det samme og genkender formularen ved deploy.

**B. Git-baseret (anbefalet når I skal opdatere siden løbende)**
1. Push denne mappe til et GitHub-repo.
2. Netlify → **Add new site → Import an existing project** → vælg repoet.
3. Build command: (tom — der er intet build-step). Publish directory: `.`
4. Hver push til main branch redeployer automatisk.

## Næste skridt (ikke lavet endnu)

- Rigtige butiksdata (database eller CMS) i stedet for hardcoded demo-cards.
- Betalingsflow for butikker der vil have "TOP"-placering (planerne i UI'et viser endnu ingen priser offentligt).
- Verificering af butikker (den grønne "Verificeret"-pille er pt. kun visuel, ingen faktisk verificeringsproces bag).
