# Compagno d'Avventura — versione app web

## Cos'è
Una PWA (app web installabile) che gira su qualsiasi telefono/PC con browser.
I dati dei personaggi restano **solo sul dispositivo di chi la usa** (salvati in locale, nessun server).
Le funzioni con l'IA (casuale, da descrizione, da foto, spiega incantesimo) usano **la chiave API di chi la apre**,
scelta tra Claude, ChatGPT o Gemini nelle Impostazioni (icona ⚙ in alto).

## Come pubblicarla (gratis, 5 minuti) — GitHub Pages
1. Crea un account su github.com se non ne hai uno.
2. Crea un nuovo repository (es. "dnd-compagno"), pubblico.
3. Carica dentro tutti i file di questa cartella (index.html, app.js, styles.css, manifest.json, sw.js, cartella icons).
4. Vai su Settings → Pages, scegli il branch "main" e cartella "/ (root)", salva.
5. Dopo un minuto GitHub ti darà un link tipo `https://tuonome.github.io/dnd-compagno/`.

## Alternativa ancora più veloce — Netlify Drop
1. Vai su https://app.netlify.com/drop
2. Trascina dentro la cartella con tutti i file.
3. In pochi secondi ti dà un link pubblico pronto da condividere.

## Come installarla sul Pixel (o qualsiasi Android)
1. Apri il link con Chrome.
2. Tocca i tre puntini in alto a destra → "Aggiungi a schermata Home" (o Chrome ti proporrà da solo "Installa app").
3. Comparirà un'icona come un'app vera, si apre a schermo intero, funziona anche offline (tranne le funzioni IA, che serve internet).

## Come condividerla con un amico
Basta mandargli il link pubblico (GitHub Pages o Netlify). Lui apre, va in Impostazioni,
mette la sua chiave IA (Claude/ChatGPT/Gemini) e crea i suoi personaggi — tutto resta sul suo telefono, separato dal tuo.

## Novità di questa versione
- **Nessuna chiave necessaria di default**: l'app usa Puter.js in automatico. Alla prima generazione IA potrebbe apparire un popup di accesso gratuito a puter.com — è normale, va fatto una sola volta per dispositivo. Se preferisci, in Impostazioni puoi comunque passare a Claude/ChatGPT/Gemini con una tua chiave.
- **Creazione guidata "Razza & Classe"**: scegli tra le 9 razze e le 12 classi base (regole ufficiali gratuite, "Basic Rules"), assegni le caratteristiche con l'array standard, scegli trucchetti/incantesimi iniziali se la classe li prevede.
- **Sali di livello**: automatico (calcola tutto da solo) o manuale (tiri tu il dado vita, scegli il miglioramento caratteristiche o talento, e puoi chiedere un suggerimento all'IA prima di decidere).
- **Riposo breve**: spendi dadi vita per curarti, recuperi gli slot patto del Warlock.
- **Riposo lungo**: PF al massimo, tutti gli slot incantesimo ricaricati, metà dadi vita recuperati.
- **Ritratto IA**: pulsante "Ritratto" nella scheda, genera un'immagine del personaggio (richiede Puter.js o una chiave con generazione immagini).
- **Incantesimi**: ora segnalabili come "lanciato" durante la sessione, con slot per livello se la classe li usa.

## Limite sulle sottoclassi
Le sottoclassi complete di tutti i manuali sono contenuto a pagamento di Wizards of the Coast: l'app include solo la sottoclasse base gratuita per ciascuna classe. Per varianti diverse, usa la creazione "Da descrizione" e chiedi esplicitamente la sottoclasse che vuoi: l'IA la applicherà a livello di tratti/incantesimi senza dover copiare testo dai manuali.

## Dove si prende una chiave API
- Claude: console.anthropic.com → API Keys
- ChatGPT: platform.openai.com → API Keys
- Gemini: aistudio.google.com → Get API key

Nota: le chiavi API costano in base all'uso (di solito centesimi per ogni personaggio generato), non sono abbonamenti.

## Nota su ChatGPT (OpenAI) e CORS
Anthropic e Gemini permettono chiamate dirette dal browser. Con OpenAI, in alcuni casi il browser può bloccare
la richiesta per motivi di sicurezza (errore "CORS"). Se capita con la tua chiave OpenAI, usa Claude o Gemini,
oppure fammelo sapere e ti preparo un piccolo intermediario ("proxy") per risolverlo.

## Limiti di questa versione
- Non è ancora un vero file .apk installabile dal Play Store — è una web app installabile, che sul telefono si comporta
  quasi come un'app nativa (icona, schermo intero, offline per le parti che non usano IA).
- I dati non si sincronizzano tra dispositivi diversi: ogni telefono ha i suoi personaggi salvati.
