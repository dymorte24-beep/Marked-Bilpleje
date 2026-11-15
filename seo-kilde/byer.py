# -*- coding: utf-8 -*-
"""Tekster til de faste bysider på Fyn. Hver by har sin egen, lokale tekst,
så siderne ikke ligner hinanden (det straffer Google)."""

# Byer uden for Fyn, hvor vi allerede har en bilplejer og ligger tæt på side 1 i Google.
ANDRE_BYER_ORDEN = ["birkerod", "aabybro"]

FYN_BYER_ORDEN = ["odense", "svendborg", "nyborg", "middelfart", "faaborg", "assens", "kerteminde", "bogense", "ringe"]

YDELSER = """      <p>En professionel bilplejer gør mere end en vaskehal. Typiske ydelser er:</p>
      <ul>
        <li><strong>Udvendig håndvask</strong>, der fjerner snavs og vejsalt uden at ridse lakken.</li>
        <li><strong>Indvendig rens</strong> af sæder, tæpper og plast, også mod lugt og pletter.</li>
        <li><strong>Polering</strong>, der fjerner fine ridser, swirls og mat lak. <a href="/guide/polering-eller-coating/">Læs forskellen på polering og coating</a>.</li>
        <li><strong>Keramisk coating og voks</strong>, der beskytter lakken og gør bilen lettere at holde ren.</li>
        <li><strong>Klargøring før salg</strong>, så bilen ser bedst muligt ud for køberen. <a href="/guide/klargoering-foer-salg/">Se vores tjekliste</a>.</li>
      </ul>"""

FAQ_GRATIS = ("Koster det noget at bruge FindBilplejere.dk?",
              "Nej. Det er gratis at søge, og du kontakter bilplejeren direkte på telefon, mail eller hjemmeside. Der er ingen mellemled og intet gebyr.")

BYER = {
    "odense": {
        "navn": "Odense",
        "titel": "Bilpleje i Odense – lokale bilplejere til vask, polering og coating",
        "beskrivelse": "Find bilpleje i Odense: lokale bilplejere til håndvask, indvendig rens, polering og keramisk coating. Se profiler og kontakt dem direkte. Gratis og uden mellemled.",
        "h1": "Bilpleje i Odense",
        "intro": "Her finder du bilplejere i Odense og omegn, fra Bolbro og Tarup til Hjallese og Odense SØ. Se hvad de tilbyder, og kontakt dem direkte på telefon, mail eller hjemmeside. Det er gratis, og der er ingen mellemled.",
        "sektioner": [
            ("Hvad kan en bilplejer i Odense hjælpe med?", YDELSER + """
      <p>Bor du i Odense, er vinteren hård ved bilen. Vejsalt sætter sig på lak, fælge og undervogn, så det kan betale sig at få bilen vasket grundigt og beskyttet, før det for alvor bliver koldt. <a href="/guide/vask-bilen-om-vinteren/">Læs vores guide til vinter-vask</a>.</p>"""),
            ("Polering og keramisk coating i Odense", """      <p>Polering og keramisk coating er nogle af de mest efterspurgte ydelser hos bilplejerne i Odense. De to ting hører ofte sammen: først poleres lakken, så fine ridser, swirls og mat lak forsvinder, og bagefter lægges coatingen på som et hårdt, blankt lag, der låser resultatet fast.</p>
      <p>En <strong>polering</strong> giver lakken dybde og glans igen og er et godt valg, hvis bilen er et par år gammel og har fået vaskehals-ridser. En <strong>keramisk coating</strong> beskytter lakken mod vejsalt, fugleklatter og sol i lang tid, og vand og snavs preller af, så bilen er meget lettere at holde ren. Et lettere alternativ er <strong>lakforsegling eller voks</strong>, der beskytter i nogle måneder.</p>
      <p>Spørg bilplejeren, hvor mange trin lakken skal poleres i, hvor længe coatingen holder, og om der følger en garanti med. Så kan du sammenligne tilbuddene på lige fod. <a href="/guide/polering-eller-coating/">Læs mere om polering eller coating</a>.</p>"""),
            ("Billig bilpleje i Odense: sådan får du mest for pengene", """      <p>Bilpleje behøver ikke at være dyrt. Prisen afhænger mest af, hvor meget arbejde bilen kræver, så du kan selv gøre en del for at holde den nede:</p>
      <ul>
        <li><strong>Vælg det, bilen har brug for.</strong> En grundig håndvask og indvendig rens er ofte nok. Polering og coating kan vente, til lakken trænger.</li>
        <li><strong>Tøm bilen først.</strong> Fjern affald, barnestole og ting fra bagagerummet, så bilplejeren kan gå direkte i gang.</li>
        <li><strong>Spørg efter en pakke.</strong> Mange bilplejere i Odense har faste pakker med ud- og indvendig rens, der er billigere end at bestille tingene hver for sig.</li>
        <li><strong>Kom før det bliver slemt.</strong> Vejsalt og pletter er lettere og billigere at fjerne, hvis de ikke har siddet hele vinteren.</li>
        <li><strong>Få en pris fra flere.</strong> Kontakt to eller tre bilplejere og beskriv bilen ens, så du kan sammenligne.</li>
      </ul>
      <p>Billigst er ikke altid bedst. En vaskehal er billig, men børsterne kan give de fine ridser, som du senere skal betale for at få poleret væk.</p>"""),
            ("Bilpleje i hele Odense", """      <p>Odense er Danmarks tredjestørste by, og bilplejerne ligger spredt over hele byen. Nogle har værksted i industriområderne i Odense NV, Odense SØ og Odense S, andre er mobile og kommer ud til dig. Vi viser altid de bilplejere, der ligger tættest på, så du ikke skal krydse hele byen for en vask.</p>
      <p>Vi dækker hele kommunen, også postnumrene 5000 Odense C, 5200 Odense V, 5210 Odense NV, 5220 Odense SØ, 5230 Odense M, 5240 Odense NØ, 5250 Odense SV, 5260 Odense S og 5270 Odense N, og forstæder som Dalum, Bellinge, Fraugde, Højby og Vollsmose.</p>
      <p>Kører du ind til Odense fra resten af Fyn, kan en bilplejer i byen også være et godt valg. Mange har travlt i weekenden, så ring gerne et par dage i forvejen.</p>"""),
            ("Bilpleje før salg eller aflevering af leasingbil", """      <p>Mange bilejere i Odense bruger en bilplejer, lige før bilen skal sælges eller afleveres. En ren bil uden lugt og med skinnende lak ser bedre ud på billederne og ved fremvisningen. Og ved aflevering af en leasingbil kan en polering af små ridser og en grundig indvendig rens spare dig for en ærgerlig regning.</p>
      <p>Se vores guides: <a href="/guide/klargoering-foer-salg/">Klargør bilen før salg</a> og <a href="/guide/aflevering-af-leasingbil/">Aflever leasingbilen uden ekstra regning</a>.</p>"""),
            ("Sådan vælger du den rigtige bilplejer", """      <ul>
        <li>Se hvilke ydelser bilplejeren tilbyder, og om de dækker dit område.</li>
        <li>Kig efter anmeldelser og billeder af tidligere arbejde.</li>
        <li>Beskriv din bil og hvad du ønsker, så du kan få en præcis pris.</li>
        <li>Spørg hvor lang tid det tager, og om du kan vente eller skal aflevere bilen.</li>
      </ul>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Odense?", "Prisen afhænger af bilens størrelse, stand og hvad du vil have lavet. En udvendig håndvask koster typisk langt mindre end en polering eller en keramisk coating. Kontakt et par bilplejere direkte og beskriv din bil, så får du den mest præcise pris."),
            ("Hvad er forskellen på en vask, en polering og en coating?", "En vask fjerner snavs. En polering fjerner fine ridser og mat lak, så lakken skinner igen. En coating er et beskyttende lag oven på lakken, der gør bilen lettere at holde ren og beskytter mod vejsalt og vejr i måneder eller år."),
            ("Hvor holder keramisk coating i Odense?", "En keramisk coating holder typisk fra et til flere år, afhængigt af produktet, og hvordan bilen bliver vasket bagefter. Spørg bilplejeren, hvor længe deres coating holder, og hvordan du bedst vedligeholder den. Mange anbefaler en blid håndvask uden vaskehal."),
            ("Hvordan finder jeg billig bilpleje i Odense?", "Vælg kun de ydelser bilen har brug for, tøm bilen inden, og spørg efter en fast pakke. Kontakt gerne et par bilplejere direkte og beskriv bilen ens, så kan du sammenligne priserne. Det koster ikke noget at søge på FindBilplejere.dk."),
            ("Hvor ofte bør jeg få min bil plejet?", "De fleste har godt af en grundig rengøring et par gange om året, især før og efter vinteren, hvor vejsalt slider på lak og undervogn. Kører du meget, eller holder bilen udendørs, kan det betale sig oftere."),
            ("Kan en bilplejer komme ud til mig i Odense?", "Ja, nogle bilplejere tilbyder mobil bilpleje og kommer hjem til dig eller på arbejdspladsen. De er markeret med \"Kommer ud til dig\" i listen. Se på den enkelte bilplejers profil, hvilket område de dækker."),
            ("Hvor lang tid tager bilpleje?", "En udvendig vask tager ofte en til to timer. En grundig indvendig rens eller en polering kan tage det meste af en dag, og en keramisk coating tager typisk en til to dage, fordi lakken skal poleres først. Spørg bilplejeren, når du booker."),
            ("Hvornår skal jeg bestille tid?", "Efterår og forår er travle perioder, fordi mange vil have bilen klar til og fri af vinteren. Bestil gerne en til to uger i forvejen, hvis du har en bestemt dato, fx et bilsalg eller en leasingaflevering."),
            FAQ_GRATIS,
        ],
        "guides": ["vask-bilen-om-vinteren", "polering-eller-coating", "klargoering-foer-salg", "aflevering-af-leasingbil"],
    },
    "svendborg": {
        "navn": "Svendborg",
        "titel": "Bilpleje i Svendborg – find en bilplejer på Sydfyn",
        "beskrivelse": "Find bilpleje i Svendborg og på Sydfyn. Se lokale bilplejere til vask, polering, coating og indvendig rens, og kontakt dem direkte. Gratis og uden mellemled.",
        "h1": "Bilpleje i Svendborg",
        "intro": "Find en bilplejer i Svendborg og på Sydfyn, også hvis du bor på Tåsinge eller i Ollerup, Skårup eller Vester Skerninge. Se ydelser og kontakt bilplejeren direkte. Det er gratis, og der er ingen mellemled.",
        "sektioner": [
            ("Havneby, salt luft og bakker", """      <p>Svendborg ligger helt ned til Svendborgsund, og mange bor tæt på vandet. Den salte luft fra havet og vejsaltet om vinteren er en hård kombination for lak, fælge og undervogn. En grundig vask og et beskyttende lag voks eller coating gør stor forskel for, hvor længe bilen holder sig pæn.</p>
      <p>Om sommeren kommer mange turister og sejlere til byen, og mange lokale bruger bilen til at trække båd eller campingvogn. Har du kørt ned ad en slæbested-rampe med saltvand, så skyl bilen og trailerens hjul godt bagefter.</p>"""),
            ("Hvad kan en bilplejer i Svendborg hjælpe med?", YDELSER),
            ("Sådan finder du den rigtige bilplejer på Sydfyn", """      <p>På Sydfyn er der længere mellem bilplejerne end i Odense. Derfor viser vi dig altid de nærmeste, sorteret efter afstand. Nogle bilplejere kører ud, så du ikke selv skal aflevere bilen. Se efter mærket "Kommer ud til dig".</p>
      <p>Beskriv din bil og hvad du vil have lavet, når du kontakter bilplejeren. Så får du hurtigst en præcis pris.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Svendborg?", "Det afhænger af bilen, dens stand og hvad du vil have lavet. En håndvask koster langt mindre end en polering eller en keramisk coating. Kontakt bilplejeren direkte og beskriv din bil for at få en præcis pris."),
            ("Skader den salte havluft i Svendborg min bil?", "Saltet i luften tæt ved vandet kan sætte sig på lak og metal, ligesom vejsalt. En regelmæssig vask og en beskyttelse som voks eller coating gør det sværere for saltet at sætte sig fast."),
            ("Er der bilplejere, der kommer ud til mig på Sydfyn?", "Ja, nogle bilplejere tilbyder mobil bilpleje. De er markeret med \"Kommer ud til dig\" i listen. Spørg dem, om de dækker din adresse."),
            FAQ_GRATIS,
        ],
    },
    "nyborg": {
        "navn": "Nyborg",
        "titel": "Bilpleje i Nyborg – find en bilplejer ved Storebælt",
        "beskrivelse": "Find bilpleje i Nyborg og omegn. Lokale bilplejere til vask, polering, coating og indvendig rens. Se profiler og kontakt dem direkte, gratis.",
        "h1": "Bilpleje i Nyborg",
        "intro": "Find en bilplejer i Nyborg og omegn, fx Ullerslev, Ørbæk og Hjulby. Se ydelser og kontakt bilplejeren direkte på telefon, mail eller hjemmeside. Det er gratis, og der er ingen mellemled.",
        "sektioner": [
            ("Mange kilometer på motorvejen", """      <p>Nyborg ligger ved Storebæltsbroen, og mange herfra pendler over broen eller ad E20 mod Odense og Jylland. Mange kilometer på motorvejen betyder stenslag og fine ridser i fronten, insekter om sommeren og et tykt lag salt om vinteren.</p>
      <p>En bilplejer kan rense fronten for insekter og tjære, polere fine ridser væk og lægge en coating eller voks på, så snavset ikke sidder så hårdt fast. Det gør også bilen meget nemmere at vaske selv mellem besøgene.</p>"""),
            ("Hvad kan en bilplejer i Nyborg hjælpe med?", YDELSER),
            ("Kort vej til flere bilplejere", """      <p>Fra Nyborg er der kort vej til bilplejere i Odense og på resten af Østfyn. Vi viser altid de nærmeste bilplejere sorteret efter afstand, så du hurtigt kan se, hvem der ligger tættest på dig.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Nyborg?", "Det afhænger af bilens størrelse, stand og hvad du vil have lavet. Kontakt et par bilplejere direkte og beskriv din bil, så får du den mest præcise pris."),
            ("Kan en bilplejer fjerne stenslag?", "Små stenslag kan ofte gøres mindre synlige, og fine ridser omkring dem kan poleres væk. Dybe stenslag, der går gennem lakken, skal typisk pletlakeres. Spørg bilplejeren, hvad der kan lade sig gøre på din bil."),
            ("Hvor ofte skal en pendlerbil vaskes om vinteren?", "Kører du dagligt på saltede veje, er en vask hver anden til tredje uge en god tommelfingerregel, gerne med skyl af undervogn og hjulkasser."),
            FAQ_GRATIS,
        ],
    },
    "middelfart": {
        "navn": "Middelfart",
        "titel": "Bilpleje i Middelfart – find en bilplejer ved Lillebælt",
        "beskrivelse": "Find bilpleje i Middelfart og Vestfyn. Lokale bilplejere til vask, polering, coating og indvendig rens. Kontakt dem direkte, gratis og uden mellemled.",
        "h1": "Bilpleje i Middelfart",
        "intro": "Find en bilplejer i Middelfart og omegn, fx Strib, Nørre Aaby og Ejby. Se ydelser og kontakt bilplejeren direkte. Det er gratis, og der er ingen mellemled.",
        "sektioner": [
            ("Pendlerby mellem Fyn og Jylland", """      <p>Middelfart ligger ved Lillebælt, og mange herfra kører dagligt over broen til arbejde i Fredericia, Kolding og Vejle. Det giver mange kilometer på motorvejen, og det kan ses på lakken: stenslag, insekter, tjære og vejsalt.</p>
      <p>En professionel vask og en beskyttelse af lakken holder bilen pæn, også når den bliver brugt meget. Overvej en keramisk coating, hvis du vil have en bil, der er nem at holde ren hele året. <a href="/guide/polering-eller-coating/">Læs om forskellen på voks og coating</a>.</p>"""),
            ("Hvad kan en bilplejer i Middelfart hjælpe med?", YDELSER),
            ("Find den nærmeste bilplejer", """      <p>Vi viser bilplejere i og omkring Middelfart, sorteret efter afstand. Bor du i den vestlige del af Fyn, kan der også være bilplejere i Trekantområdet, som ligger tæt på. Kontakt dem direkte og spørg, hvornår de har tid.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Middelfart?", "Prisen afhænger af bilen, dens stand og hvilken behandling du ønsker. Beskriv bilen, når du kontakter bilplejeren, så får du den mest præcise pris."),
            ("Kan jeg få bilen plejet, mens jeg er på arbejde?", "Mange bilplejere tilbyder, at du afleverer bilen om morgenen og henter den efter arbejde. Nogle kommer også ud til dig. Spørg bilplejeren, hvad der passer bedst."),
            ("Hvornår skal jeg have lagt coating på?", "Det bedste tidspunkt er før vinteren, så lakken er beskyttet mod vejsalt. Coating kan dog lægges på hele året, så længe bilen kan stå tørt og varmt, mens den hærder."),
            FAQ_GRATIS,
        ],
    },
    "faaborg": {
        "navn": "Faaborg",
        "titel": "Bilpleje i Faaborg – find en bilplejer på Sydfyn",
        "beskrivelse": "Find bilpleje i Faaborg og omegn. Se bilplejere til vask, polering, coating og indvendig rens tæt på dig, og kontakt dem direkte. Gratis.",
        "h1": "Bilpleje i Faaborg",
        "intro": "Find en bilplejer i Faaborg og omegn, fx Horne, Millinge og Korinth. Se ydelser og kontakt bilplejeren direkte på telefon, mail eller hjemmeside. Gratis og uden mellemled.",
        "sektioner": [
            ("Landeveje, mudder og kystluft", """      <p>Omkring Faaborg kører de fleste på landeveje mellem marker, skov og Svanninge Bakker. Det betyder mudder, grus og jord i hjulkasser og på dørkarme, især i efteråret og vinteren. Ved kysten kommer den salte havluft oveni.</p>
      <p>En grundig undervognsvask og en rens af hjulkasserne fjerner det, du ikke selv kan se. Og en god indvendig rens tager det sand og den jord, der bliver båret ind i bilen.</p>"""),
            ("Hvad kan en bilplejer i Faaborg hjælpe med?", YDELSER),
            ("Find den nærmeste bilplejer", """      <p>Vi viser altid bilplejere i og omkring Faaborg, sorteret efter afstand. Er der ikke en bilplejer i selve byen, finder du de nærmeste i Svendborg, Ringe og Odense. Nogle bilplejere kører ud, så du slipper for turen.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Faaborg?", "Det afhænger af bilen og hvad du vil have lavet. Kontakt bilplejeren direkte og beskriv bilen, så får du den mest præcise pris."),
            ("Hvordan får jeg mudder og jord ud af bilen?", "Støvsug grundigt og lad mudder tørre, før du børster det væk. Sidder det fast i tæpper og måtter, kan en bilplejer dybderense dem med en tæpperenser."),
            ("Er der bilplejere, der kommer ud til mig?", "Ja, nogle tilbyder mobil bilpleje og er markeret med \"Kommer ud til dig\". Spørg om de dækker din adresse."),
            FAQ_GRATIS,
        ],
    },
    "assens": {
        "navn": "Assens",
        "titel": "Bilpleje i Assens – find en bilplejer på Vestfyn",
        "beskrivelse": "Find bilpleje i Assens og på Vestfyn. Bilplejere til vask, polering, coating og indvendig rens. Kontakt dem direkte, gratis og uden mellemled.",
        "h1": "Bilpleje i Assens",
        "intro": "Find en bilplejer i Assens og omegn, fx Aarup, Glamsbjerg, Haarby og Vissenbjerg. Se ydelser og kontakt bilplejeren direkte. Det er gratis, og der er ingen mellemled.",
        "sektioner": [
            ("Bilpleje ved Lillebælts kyst", """      <p>Assens ligger ud til Lillebælt med havn og lystbådehavn, og oplandet er præget af landbrug og landeveje. Mange biler i Assens Kommune kører derfor både i salt kystluft og på veje med jord og grus fra markerne.</p>
      <p>Det kan betale sig at få bilen vasket grundigt et par gange om året og få lakken beskyttet med voks eller coating. Så sidder snavset ikke så hårdt fast, og bilen holder værdien bedre.</p>"""),
            ("Hvad kan en bilplejer i Assens hjælpe med?", YDELSER),
            ("Find den nærmeste bilplejer", """      <p>Vi viser bilplejere i og omkring Assens, sorteret efter afstand. Fra Assens er der ikke langt til bilplejere i Odense og på Vestfyn.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Assens?", "Prisen afhænger af bilens størrelse, stand og den behandling du ønsker. Kontakt bilplejeren direkte og beskriv bilen."),
            ("Hvad er forskellen på voks og coating?", "Voks er nem at lægge på og holder typisk et par måneder. En keramisk coating holder meget længere og beskytter bedre, men kræver at lakken poleres grundigt først. Læs mere i vores guide om polering og coating."),
            ("Kan en bilplejer rense hundehår ud af bilen?", "Ja, de fleste bilplejere tilbyder indvendig rens, og mange har særligt udstyr til at få hundehår ud af tæpper og sæder."),
            FAQ_GRATIS,
        ],
    },
    "kerteminde": {
        "navn": "Kerteminde",
        "titel": "Bilpleje i Kerteminde – find en bilplejer på Nordøstfyn",
        "beskrivelse": "Find bilpleje i Kerteminde og omegn. Bilplejere til vask, polering, coating og indvendig rens. Se profiler og kontakt dem direkte, gratis.",
        "h1": "Bilpleje i Kerteminde",
        "intro": "Find en bilplejer i Kerteminde og omegn, fx Munkebo, Langeskov og Martofte. Se ydelser og kontakt bilplejeren direkte. Gratis og uden mellemled.",
        "sektioner": [
            ("Fiskerby ved Storebælt", """      <p>Kerteminde ligger ved Kerteminde Fjord og Storebælt, og mange bor tæt på vandet. Havluften indeholder salt, som kan sætte sig på lakken og på blanke metaldele. Om vinteren kommer vejsaltet oveni.</p>
      <p>En regelmæssig vask fjerner saltet, før det gør skade, og en beskyttelse som voks eller keramisk coating gør lakken glat, så snavset ikke hænger fast. <a href="/guide/vask-bilen-om-vinteren/">Se vores guide til vinter-vask</a>.</p>"""),
            ("Hvad kan en bilplejer i Kerteminde hjælpe med?", YDELSER),
            ("Find den nærmeste bilplejer", """      <p>Vi viser bilplejere i og omkring Kerteminde, sorteret efter afstand. Der er kort vej til Odense, hvor der er flere bilplejere at vælge mellem.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Kerteminde?", "Det afhænger af bilen og hvad du ønsker. Kontakt bilplejeren direkte og beskriv bilen for at få en præcis pris."),
            ("Hvor ofte skal jeg vaske bilen, når jeg bor ved vandet?", "Bor du tæt ved kysten, er det en god idé at vaske bilen lidt oftere end ellers, især om vinteren. Hver anden til tredje uge er en god tommelfingerregel, når der saltes."),
            ("Kan en bilplejer komme ud til mig?", "Nogle bilplejere tilbyder mobil bilpleje og er markeret med \"Kommer ud til dig\" i listen."),
            FAQ_GRATIS,
        ],
    },
    "bogense": {
        "navn": "Bogense",
        "titel": "Bilpleje i Bogense – find en bilplejer på Nordfyn",
        "beskrivelse": "Find bilpleje i Bogense og på Nordfyn. Bilplejere til vask, polering, coating og indvendig rens. Kontakt dem direkte, gratis og uden mellemled.",
        "h1": "Bilpleje i Bogense",
        "intro": "Find en bilplejer i Bogense og på Nordfyn, fx Otterup, Søndersø og Morud. Se ydelser og kontakt bilplejeren direkte. Det er gratis, og der er ingen mellemled.",
        "sektioner": [
            ("Bilpleje på Nordfyn", """      <p>Bogense er en hyggelig havneby på Nordfyn, og oplandet består af landsbyer og landbrug. Mange kører langt på landeveje, ofte til arbejde i Odense. Det giver snavs, grus og vejsalt på bilen og mange kilometer på sæderne.</p>
      <p>En bilplejer kan give bilen en grundig vask udvendigt og en dybderens indvendigt, så den føles som ny igen. Det er også en god idé, hvis bilen snart skal sælges. <a href="/guide/klargoering-foer-salg/">Se vores tjekliste før salg</a>.</p>"""),
            ("Hvad kan en bilplejer i Bogense hjælpe med?", YDELSER),
            ("Find den nærmeste bilplejer", """      <p>Vi viser bilplejere i og omkring Bogense, sorteret efter afstand. Er der ikke en i selve byen, ser du de nærmeste på Nordfyn og i Odense.</p>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Bogense?", "Prisen afhænger af bilen, dens stand og hvad du ønsker. Kontakt bilplejeren direkte og beskriv bilen."),
            ("Kan en bilplejer fjerne lugt fra bilen?", "Ja. En grundig indvendig rens af sæder, tæpper og loft fjerner det meste lugt. Nogle bilplejere tilbyder også ozonbehandling mod fx røg- eller dyrelugt."),
            ("Hvor lang tid tager en indvendig rens?", "Typisk nogle timer, afhængigt af bilens størrelse og stand. Er sæderne meget snavsede, skal de også tørre, før du kan få bilen igen."),
            FAQ_GRATIS,
        ],
    },
    "ringe": {
        "navn": "Ringe",
        "titel": "Bilpleje i Ringe – find en bilplejer på Midtfyn",
        "beskrivelse": "Find bilpleje i Ringe og på Midtfyn. Bilplejere til vask, polering, coating og indvendig rens tæt på dig. Kontakt dem direkte, gratis.",
        "h1": "Bilpleje i Ringe",
        "intro": "Find en bilplejer i Ringe og på Midtfyn, fx Kværndrup, Ryslinge, Årslev og Nr. Lyndelse. Se ydelser og kontakt bilplejeren direkte. Gratis og uden mellemled.",
        "sektioner": [
            ("Midt på Fyn, midt mellem det hele", """      <p>Ringe ligger midt på Fyn ved motorvejen mellem Odense og Svendborg, og mange herfra pendler i begge retninger. Det betyder mange kilometer, og både motorvej og landeveje sætter deres spor på lakken.</p>
      <p>Fra Ringe er der kort vej til bilplejere både i byen, i Årslev og i Odense. Vi viser dem sorteret efter afstand, så du kan vælge den, der passer dig bedst.</p>"""),
            ("Hvad kan en bilplejer i Ringe hjælpe med?", YDELSER),
            ("Sådan vælger du bilplejer", """      <ul>
        <li>Se hvilke ydelser bilplejeren tilbyder, og om de dækker dit område.</li>
        <li>Kig efter anmeldelser og billeder af tidligere arbejde.</li>
        <li>Beskriv din bil og hvad du ønsker, så du kan få en præcis pris.</li>
      </ul>"""),
        ],
        "faq": [
            ("Hvad koster bilpleje i Ringe?", "Det afhænger af bilen og hvad du vil have lavet. Kontakt bilplejeren direkte og beskriv bilen, så får du den mest præcise pris."),
            ("Hvad er en polering?", "En polering fjerner et meget tyndt lag af lakken, så fine ridser og swirls forsvinder, og lakken skinner igen. Den kan laves i flere trin, alt efter hvor slidt lakken er."),
            ("Er der bilplejere, der kører ud på Midtfyn?", "Ja, nogle tilbyder mobil bilpleje. De er markeret med \"Kommer ud til dig\" i listen."),
            FAQ_GRATIS,
        ],
    },
}

BYER["birkerod"] = {
    "navn": "Birkerød",
    "titel": "Bilpleje i Birkerød – bilplejere til polering, coating og indvendig rens",
    "beskrivelse": "Find bilpleje i Birkerød og Nordsjælland. Se lokale bilplejere til polering, keramisk coating og indvendig rens, og kontakt dem direkte. Gratis og uden mellemled.",
    "h1": "Bilpleje i Birkerød",
    "intro": "Find en bilplejer i Birkerød og omegn, også hvis du bor i Bistrup, Høje Sandbjerg, Kajerød eller Bregnerød. Se hvad de tilbyder, og kontakt bilplejeren direkte på telefon, mail eller hjemmeside. Det er gratis, og der er ingen mellemled.",
    "sektioner": [
        ("Bilpleje i Birkerød og Nordsjælland", """      <p>Birkerød ligger midt i Nordsjælland mellem skov og sø, med Hillerødmotorvejen og Kongevejen lige ved siden af. Mange pendler ind mod København hver dag, og bilen holder ofte under træerne i villakvartererne. Det giver harpiks, blade og fuglesnavs på lakken om sommeren og vejsalt om vinteren.</p>
      <p>En bilplejer kan fjerne harpiks og pletter skånsomt, polere fine ridser væk og beskytte lakken med voks eller keramisk coating, så den holder sig pæn længere. Vi viser også bilplejere i nabobyerne, fx Farum, Allerød, Hørsholm og Lyngby, sorteret efter afstand.</p>"""),
        ("Hvad kan en bilplejer i Birkerød hjælpe med?", YDELSER),
        ("Sådan vælger du den rigtige bilplejer", """      <ul>
        <li>Se hvilke ydelser bilplejeren tilbyder, og om de dækker dit område.</li>
        <li>Kig efter anmeldelser og billeder af tidligere arbejde.</li>
        <li>Beskriv din bil og hvad du ønsker, så du kan få en præcis pris.</li>
        <li>Spørg om bilplejeren kan komme ud til dig, eller om du skal aflevere bilen.</li>
      </ul>"""),
    ],
    "faq": [
        ("Hvad koster bilpleje i Birkerød?", "Prisen afhænger af bilens størrelse, stand og hvad du vil have lavet. En håndvask koster langt mindre end en polering eller en keramisk coating. Kontakt bilplejeren direkte og beskriv din bil, så får du den mest præcise pris."),
        ("Kan man få keramisk coating i Birkerød?", "Ja. Flere bilplejere i Birkerød og Nordsjælland tilbyder polering og keramisk coating. Se ydelserne på den enkelte bilplejers profil i listen ovenfor."),
        ("Hvordan får jeg harpiks og fuglesnavs af lakken?", "Fjern det hurtigt, da det kan ætse sig ned i lakken. Brug ikke en hård svamp. En bilplejer kan fjerne det skånsomt og polere eventuelle mærker væk bagefter, og en coating gør det lettere at fjerne næste gang."),
        FAQ_GRATIS,
    ],
    "guides": ["polering-eller-coating", "vask-bilen-om-vinteren", "klargoering-foer-salg", "aflevering-af-leasingbil"],
    "naboer": [("farum", "Farum"), ("helsingor", "Helsingør"), ("lyngby", "Lyngby"), ("hillerod", "Hillerød")],
}

BYER["aabybro"] = {
    "navn": "Aabybro",
    "titel": "Bilpleje i Aabybro – bilplejere til keramisk coating og polering",
    "beskrivelse": "Find bilpleje i Aabybro og Vesthimmerland/Jammerbugt. Lokale bilplejere til keramisk coating, polering og indvendig rens. Kontakt dem direkte, gratis.",
    "h1": "Bilpleje i Aabybro",
    "intro": "Find en bilplejer i Aabybro og omegn, fx Biersted, Gjøl, Brovst og Nørresundby. Se hvad de tilbyder, og kontakt bilplejeren direkte på telefon, mail eller hjemmeside. Det er gratis, og der er ingen mellemled.",
    "sektioner": [
        ("Bilpleje i Aabybro og Jammerbugt", """      <p>Aabybro ligger i Jammerbugt Kommune, tæt på Limfjorden og ikke langt fra Vesterhavet. Vind fra havet, sand og vejsalt om vinteren slider på lak, fælge og undervogn, og mange kører dagligt ad landevejen eller motorvejen ind mod Aalborg.</p>
      <p>En bilplejer kan vaske salt og sand grundigt af, polere fine ridser væk og beskytte lakken med keramisk coating eller voks, så snavset ikke sætter sig så hårdt fast. Vi viser også bilplejere i Nordjylland omkring Aabybro, sorteret efter afstand.</p>"""),
        ("Hvad kan en bilplejer i Aabybro hjælpe med?", YDELSER),
        ("Keramisk coating i Aabybro", """      <p>Keramisk coating er et hårdt, blankt lag oven på lakken. Det beskytter mod vejsalt, sand og fugleklatter og gør bilen langt lettere at holde ren, fordi vand og snavs preller af. Inden coatingen lægges på, bliver lakken som regel poleret, så den er helt ren og uden fine ridser.</p>
      <p>Spørg bilplejeren, hvor længe coatingen holder, hvor mange trin lakken poleres i, og hvordan du bedst vasker bilen bagefter. <a href="/guide/polering-eller-coating/">Læs mere om polering eller coating</a>.</p>"""),
    ],
    "faq": [
        ("Hvad koster bilpleje i Aabybro?", "Det afhænger af bilen, dens stand og hvad du vil have lavet. En håndvask koster langt mindre end en polering eller en keramisk coating. Kontakt bilplejeren direkte og beskriv din bil for at få en præcis pris."),
        ("Hvor længe holder keramisk coating?", "Typisk fra et til flere år, afhængigt af produktet, og hvordan bilen bliver vasket bagefter. Spørg bilplejeren, hvor længe deres coating holder, og om der følger en garanti med."),
        ("Er der bilpleje tæt på Aabybro, hvis jeg bor i Nørresundby eller Brovst?", "Ja. Listen ovenfor viser bilplejerne tættest på Aabybro, sorteret efter afstand, så du kan se hvem der ligger nærmest dig."),
        FAQ_GRATIS,
    ],
    "guides": ["polering-eller-coating", "vask-bilen-om-vinteren", "klargoering-foer-salg", "aflevering-af-leasingbil"],
    "naboer": [("aalborg", "Aalborg"), ("norresundby", "Nørresundby"), ("brovst", "Brovst"), ("fjerritslev", "Fjerritslev")],
}
