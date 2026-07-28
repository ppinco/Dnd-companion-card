const { useState, useEffect, useRef } = React;

/* ============ CONFIG & HELPERS ============ */

const ABILITIES = [
  { key: "str", label: "Forza" },
  { key: "dex", label: "Destrezza" },
  { key: "con", label: "Costituzione" },
  { key: "int", label: "Intelligenza" },
  { key: "wis", label: "Saggezza" },
  { key: "cha", label: "Carisma" },
];

const SKILLS = [
  { name: "Atletica", ab: "str" },
  { name: "Acrobazia", ab: "dex" },
  { name: "Rapidità di mano", ab: "dex" },
  { name: "Furtività", ab: "dex" },
  { name: "Arcano", ab: "int" },
  { name: "Storia", ab: "int" },
  { name: "Indagare", ab: "int" },
  { name: "Natura", ab: "int" },
  { name: "Religione", ab: "int" },
  { name: "Addestrare animali", ab: "wis" },
  { name: "Percezione", ab: "wis" },
  { name: "Intuizione", ab: "wis" },
  { name: "Medicina", ab: "wis" },
  { name: "Sopravvivenza", ab: "wis" },
  { name: "Inganno", ab: "cha" },
  { name: "Intimidire", ab: "cha" },
  { name: "Intrattenere", ab: "cha" },
  { name: "Persuasione", ab: "cha" },
];

const HIT_DICE = {
  barbaro: 12, barbarian: 12,
  guerriero: 10, fighter: 10, paladino: 10, paladin: 10, ramingo: 10, ranger: 10,
  bardo: 8, bard: 8, chierico: 8, cleric: 8, druido: 8, druid: 8,
  monaco: 8, monk: 8, ladro: 8, rogue: 8, warlock: 8, patto: 8,
  stregone: 6, sorcerer: 6, mago: 6, wizard: 6,
};

function hitDie(className) {
  if (!className) return 8;
  const k = className.trim().toLowerCase();
  for (const key in HIT_DICE) if (k.includes(key)) return HIT_DICE[key];
  return 8;
}
function abilityMod(score) { return Math.floor((Number(score || 10) - 10) / 2); }
function fmtMod(n) { return n >= 0 ? `+${n}` : `${n}`; }
function profBonus(level) { return 2 + Math.floor((Math.max(1, level) - 1) / 4); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function rollDie(sides) { return 1 + Math.floor(Math.random() * sides); }
function parseDice(notation) {
  if (!notation) return { total: 0, detail: "0" };
  const m = String(notation).trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) {
    const flat = parseInt(notation, 10);
    return { total: isNaN(flat) ? 0 : flat, detail: `${notation}` };
  }
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const bonus = m[3] ? parseInt(m[3].replace(/\s/g, ""), 10) : 0;
  const rolls = Array.from({ length: count }, () => rollDie(sides));
  const total = rolls.reduce((a, b) => a + b, 0) + bonus;
  return { total, detail: `[${rolls.join(", ")}]${bonus ? ` ${fmtMod(bonus)}` : ""}` };
}

/* ============ AI PROVIDERS (usa la chiave dell'utente) ============ */

function getAISettings() {
  try { return JSON.parse(localStorage.getItem("dnd_ai_settings") || "{}"); }
  catch { return {}; }
}
function saveAISettings(s) { localStorage.setItem("dnd_ai_settings", JSON.stringify(s)); }

async function callAnthropic(apiKey, system, prompt, image, maxTokens) {
  const content = image
    ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } }, { type: "text", text: prompt }]
    : prompt;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("\n");
}

async function callOpenAI(apiKey, system, prompt, image, maxTokens) {
  const userContent = image
    ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.base64}` } }]
    : prompt;
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: userContent });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: image ? "gpt-4o" : "gpt-4o-mini", max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(apiKey, system, prompt, image, maxTokens) {
  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: image.mediaType, data: image.base64 } });
  parts.push({ text: system ? `${system}\n\n${prompt}` : prompt });
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens } }),
    }
  );
  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
}

async function callAI({ system, prompt, image, maxTokens = 1000 }) {
  const settings = getAISettings();
  if (!settings.apiKey || !settings.provider) {
    throw new Error("Nessuna IA configurata. Vai in Impostazioni e inserisci un provider e una chiave API.");
  }
  if (settings.provider === "anthropic") return callAnthropic(settings.apiKey, system, prompt, image, maxTokens);
  if (settings.provider === "openai") return callOpenAI(settings.apiKey, system, prompt, image, maxTokens);
  if (settings.provider === "gemini") return callGemini(settings.apiKey, system, prompt, image, maxTokens);
  throw new Error("Provider IA non riconosciuto.");
}

function extractJson(text) {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Nessun JSON trovato nella risposta");
  return JSON.parse(clean.slice(start, end + 1));
}

const SCHEMA_HINT = `Rispondi SOLO con un oggetto JSON valido (niente testo introduttivo, niente backtick), con esattamente questa forma:
{
 "name": "string",
 "race": "string",
 "class": "string",
 "background": "string",
 "level": number,
 "abilityScores": {"str":number,"dex":number,"con":number,"int":number,"wis":number,"cha":number},
 "ac": number,
 "speed": number,
 "hpMax": number,
 "proficiencies": {"saves": ["str"], "skills": ["Percezione"]},
 "attacks": [{"name":"string","bonus":number,"damage":"1d8+3","damageType":"tagliente"}],
 "spells": [{"name":"string","level":number}],
 "inventory": [{"name":"string","qty":number}],
 "notes": "string breve"
}
Usa nomi e ambientazione in italiano, coerenti con D&D 5e. Massimo 3 attacchi, massimo 6 incantesimi, massimo 8 oggetti nell'inventario.`;

function normalizeCharacter(raw) {
  const scores = raw.abilityScores || {};
  const hpMax = Math.max(1, Number(raw.hpMax) || 8);
  return {
    id: uid(),
    name: raw.name || "Senza nome",
    race: raw.race || "Sconosciuta",
    class: raw.class || "Avventuriero",
    background: raw.background || "",
    level: Math.max(1, Number(raw.level) || 1),
    xp: 0,
    locked: false,
    abilityScores: {
      str: Number(scores.str) || 10, dex: Number(scores.dex) || 10, con: Number(scores.con) || 10,
      int: Number(scores.int) || 10, wis: Number(scores.wis) || 10, cha: Number(scores.cha) || 10,
    },
    ac: Number(raw.ac) || 10,
    speed: Number(raw.speed) || 9,
    hp: { max: hpMax, current: hpMax, temp: 0 },
    healBonus: 0,
    proficiencies: {
      saves: (raw.proficiencies && raw.proficiencies.saves) || [],
      skills: (raw.proficiencies && raw.proficiencies.skills) || [],
    },
    attacks: Array.isArray(raw.attacks) ? raw.attacks.slice(0, 6) : [],
    spells: Array.isArray(raw.spells) ? raw.spells.slice(0, 12).map((s) => ({ ...s, description: "" })) : [],
    spellSlots: { "1": { max: 2, used: 0 } },
    inventory: Array.isArray(raw.inventory) ? raw.inventory.slice(0, 12) : [],
    notes: raw.notes || "",
    log: [{ ts: Date.now(), text: "Personaggio creato." }],
  };
}
function pushLog(char, text) {
  const log = [{ ts: Date.now(), text }, ...(char.log || [])].slice(0, 60);
  return { ...char, log };
}

/* ============ STORAGE (localStorage, sul dispositivo di chi apre l'app) ============ */

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem("dnd_characters") || "[]"); }
  catch { return []; }
}
function saveCharacters(list) { localStorage.setItem("dnd_characters", JSON.stringify(list)); }

/* ============ APP ============ */

function App() {
  const [characters, setCharacters] = useState(() => loadCharacters());
  const [screen, setScreen] = useState("list");
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToast(null), 2600);
  }

  function persist(list) { setCharacters(list); saveCharacters(list); }

  function addCharacter(char) {
    const list = [...characters, char];
    persist(list);
    setActiveId(char.id);
    setScreen("sheet");
    showToast(`${char.name} è stato salvato su questo dispositivo.`);
  }
  function updateCharacter(id, updater) {
    persist(characters.map((c) => (c.id === id ? updater(c) : c)));
  }
  function deleteCharacter(id) {
    persist(characters.filter((c) => c.id !== id));
    setScreen("list");
    setActiveId(null);
    showToast("Personaggio eliminato.");
  }

  const active = characters.find((c) => c.id === activeId);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⚔</span>
          <span className="brand-name">Compagno d'Avventura</span>
        </div>
        <div className="top-actions">
          {screen !== "list" && <button className="ghost-btn" onClick={() => setScreen("list")}>← Personaggi</button>}
          <button className="icon-round-btn" title="Impostazioni" onClick={() => setShowSettings(true)}>⚙</button>
        </div>
      </header>

      <main className="content">
        {screen === "list" && (
          <ListScreen characters={characters} onOpen={(id) => { setActiveId(id); setScreen("sheet"); }} onCreate={() => setScreen("create")} />
        )}
        {screen === "create" && <CreateScreen onCreated={addCharacter} onCancel={() => setScreen("list")} showToast={showToast} />}
        {screen === "sheet" && active && (
          <SheetScreen char={active} onUpdate={(updater) => updateCharacter(active.id, updater)} onDelete={() => deleteCharacter(active.id)} showToast={showToast} />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

/* ============ SETTINGS ============ */

function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(() => ({ provider: "anthropic", apiKey: "", ...getAISettings() }));
  const [saved, setSaved] = useState(false);

  function save() {
    saveAISettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Impostazioni IA</h3>
        <p className="muted small">
          Le funzioni con l'IA (personaggio casuale, da descrizione, da foto, spiega incantesimo) usano la chiave che inserisci qui.
          Resta salvata solo su questo dispositivo, in locale — non passa da nessuna parte tranne che al provider scelto.
        </p>
        <label className="field-label">Provider</label>
        <div className="provider-grid">
          {[["anthropic", "Claude"], ["openai", "ChatGPT"], ["gemini", "Gemini"]].map(([id, label]) => (
            <button key={id} className={`provider-chip ${settings.provider === id ? "provider-chip-active" : ""}`}
              onClick={() => setSettings({ ...settings, provider: id })}>{label}</button>
          ))}
        </div>
        <label className="field-label">Chiave API</label>
        <input type="password" className="text-input" value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} placeholder="Incolla qui la tua chiave" />
        <p className="muted small" style={{ marginTop: 8 }}>
          Claude: console.anthropic.com · ChatGPT: platform.openai.com · Gemini: aistudio.google.com
        </p>
        {saved && <p className="ok-text">Impostazioni salvate.</p>}
        <div className="btn-row">
          <button className="ghost-btn" onClick={onClose}>Chiudi</button>
          <button className="primary-btn" onClick={save}>Salva</button>
        </div>
      </div>
    </div>
  );
}

/* ============ LIST SCREEN ============ */

function ListScreen({ characters, onOpen, onCreate }) {
  return (
    <div className="list-screen">
      <div className="list-header">
        <h1>I tuoi personaggi</h1>
        <button className="primary-btn" onClick={onCreate}>+ Nuovo personaggio</button>
      </div>
      {characters.length === 0 && (
        <div className="empty">
          <p>Non hai ancora nessun personaggio.</p>
          <p className="muted">Crealo da zero, in modo casuale, da una descrizione o scansionando una scheda.</p>
        </div>
      )}
      <div className="card-grid">
        {characters.map((c) => (
          <button key={c.id} className="char-card" onClick={() => onOpen(c.id)}>
            <div className="char-card-top">
              <span className="char-name">{c.name}{c.locked ? " 🔒" : ""}</span>
              <span className="char-level">Lv {c.level}</span>
            </div>
            <div className="char-sub">{c.race} · {c.class}</div>
            <div className="hp-mini"><div className="hp-mini-fill" style={{ width: `${Math.max(0, (c.hp.current / c.hp.max) * 100)}%` }} /></div>
            <div className="char-sub muted">{c.hp.current}/{c.hp.max} PF</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ CREATE SCREEN ============ */

function CreateScreen({ onCreated, onCancel, showToast }) {
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [desc, setDesc] = useState("");
  const [level, setLevel] = useState(1);
  const fileRef = useRef(null);

  async function generateRandom() {
    setLoading(true); setError("");
    try {
      const text = await callAI({ prompt: `Genera un personaggio D&D 5e completamente casuale e originale, di livello ${level}.\n${SCHEMA_HINT}`, maxTokens: 1000 });
      onCreated(normalizeCharacter(extractJson(text)));
    } catch (e) { setError(e.message || "Non sono riuscito a generare il personaggio."); }
    finally { setLoading(false); }
  }
  async function generateFromDescription() {
    if (!desc.trim()) { setError("Scrivi prima una descrizione."); return; }
    setLoading(true); setError("");
    try {
      const text = await callAI({ prompt: `Crea un personaggio D&D 5e di livello ${level} basato su questa descrizione: "${desc}".\n${SCHEMA_HINT}`, maxTokens: 1000 });
      onCreated(normalizeCharacter(extractJson(text)));
    } catch (e) { setError(e.message || "Non sono riuscito a generare il personaggio."); }
    finally { setLoading(false); }
  }
  async function generateFromScan(file) {
    setLoading(true); setError("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.onerror = () => reject(new Error("Lettura file fallita"));
        r.readAsDataURL(file);
      });
      const text = await callAI({
        prompt: `Questa è la foto di una scheda personaggio D&D scritta a mano o stampata. Estraine i dati. Se un campo non è leggibile, stima un valore ragionevole.\n${SCHEMA_HINT}`,
        image: { base64, mediaType: file.type || "image/jpeg" },
        maxTokens: 1200,
      });
      onCreated(normalizeCharacter(extractJson(text)));
    } catch (e) { setError(e.message || "Non sono riuscito a leggere la scheda dalla foto."); }
    finally { setLoading(false); }
  }

  return (
    <div className="create-screen">
      <h1>Nuovo personaggio</h1>
      {!method && (
        <div className="method-grid">
          <button className="method-card" onClick={() => setMethod("manual")}><span className="method-icon">✎</span><span>Manuale</span><span className="muted small">Inserisci tutto tu</span></button>
          <button className="method-card" onClick={() => setMethod("random")}><span className="method-icon">🎲</span><span>Casuale</span><span className="muted small">Generato dall'IA</span></button>
          <button className="method-card" onClick={() => setMethod("desc")}><span className="method-icon">📜</span><span>Da descrizione</span><span className="muted small">Racconta chi è</span></button>
          <button className="method-card" onClick={() => setMethod("scan")}><span className="method-icon">📷</span><span>Da foto</span><span className="muted small">Scansiona una scheda</span></button>
        </div>
      )}

      {method === "manual" && <ManualForm onCreated={onCreated} onBack={() => setMethod(null)} />}

      {(method === "random" || method === "desc") && (
        <div className="panel">
          <label className="field-label">Livello</label>
          <input type="number" min="1" max="20" value={level} onChange={(e) => setLevel(e.target.value)} className="text-input small-input" />
          {method === "desc" && (
            <>
              <label className="field-label">Descrizione</label>
              <textarea className="text-input" rows={4} placeholder="Es: un'elfa arciera solitaria, cinica, che protegge una foresta antica…" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </>
          )}
          {error && <p className="error-text">{error}</p>}
          <div className="btn-row">
            <button className="ghost-btn" onClick={() => setMethod(null)}>Indietro</button>
            <button className="primary-btn" disabled={loading} onClick={method === "random" ? generateRandom : generateFromDescription}>{loading ? "Genero…" : "Genera personaggio"}</button>
          </div>
        </div>
      )}

      {method === "scan" && (
        <div className="panel">
          <p className="muted">Fai una foto (o carica un'immagine) della scheda cartacea: proverò a leggerla e a creare il personaggio.</p>
          <input ref={fileRef} type="file" accept="image/*" className="text-input" onChange={(e) => { const f = e.target.files[0]; if (f) generateFromScan(f); }} />
          {loading && <p className="muted">Leggo la scheda…</p>}
          {error && <p className="error-text">{error}</p>}
          <div className="btn-row"><button className="ghost-btn" onClick={() => setMethod(null)}>Indietro</button></div>
        </div>
      )}

      {!method && <div className="btn-row" style={{ marginTop: 16 }}><button className="ghost-btn" onClick={onCancel}>Annulla</button></div>}
    </div>
  );
}

function ManualForm({ onCreated, onBack }) {
  const [form, setForm] = useState({ name: "", race: "", class: "", background: "", level: 1, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ac: 10, speed: 9, hpMax: 10 });
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function submit() {
    if (!form.name.trim()) return;
    onCreated(normalizeCharacter({
      name: form.name, race: form.race, class: form.class, background: form.background, level: form.level,
      abilityScores: { str: form.str, dex: form.dex, con: form.con, int: form.int, wis: form.wis, cha: form.cha },
      ac: form.ac, speed: form.speed, hpMax: form.hpMax,
      proficiencies: { saves: [], skills: [] }, attacks: [], spells: [], inventory: [], notes: "",
    }));
  }
  return (
    <div className="panel">
      <label className="field-label">Nome</label>
      <input className="text-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
      <div className="grid-2">
        <div><label className="field-label">Razza</label><input className="text-input" value={form.race} onChange={(e) => set("race", e.target.value)} /></div>
        <div><label className="field-label">Classe</label><input className="text-input" value={form.class} onChange={(e) => set("class", e.target.value)} /></div>
      </div>
      <div className="grid-2">
        <div><label className="field-label">Background</label><input className="text-input" value={form.background} onChange={(e) => set("background", e.target.value)} /></div>
        <div><label className="field-label">Livello</label><input type="number" min="1" max="20" className="text-input" value={form.level} onChange={(e) => set("level", Number(e.target.value))} /></div>
      </div>
      <label className="field-label">Caratteristiche</label>
      <div className="ability-grid">
        {ABILITIES.map((a) => (
          <div key={a.key} className="ability-input">
            <span className="small">{a.label.slice(0, 3).toUpperCase()}</span>
            <input type="number" className="text-input tiny" value={form[a.key]} onChange={(e) => set(a.key, Number(e.target.value))} />
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div><label className="field-label">CA</label><input type="number" className="text-input" value={form.ac} onChange={(e) => set("ac", Number(e.target.value))} /></div>
        <div><label className="field-label">PF massimi</label><input type="number" className="text-input" value={form.hpMax} onChange={(e) => set("hpMax", Number(e.target.value))} /></div>
      </div>
      <div className="btn-row">
        <button className="ghost-btn" onClick={onBack}>Indietro</button>
        <button className="primary-btn" onClick={submit}>Crea personaggio</button>
      </div>
    </div>
  );
}

/* ============ SHEET SCREEN ============ */

function SheetScreen({ char, onUpdate, onDelete, showToast }) {
  const [tab, setTab] = useState("panoramica");
  const [confirmLevel, setConfirmLevel] = useState(false);
  const [confirmTotal, setConfirmTotal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function doResetLevel() {
    onUpdate((c) => {
      const hd = hitDie(c.class);
      const conMod = abilityMod(c.abilityScores.con);
      const newMax = Math.max(1, hd + conMod);
      return pushLog({ ...c, level: 1, xp: 0, hp: { ...c.hp, max: newMax, current: newMax, temp: 0 }, spellSlots: { "1": { max: 2, used: 0 } } }, "Livello riportato a 1 (reset livello).");
    });
    setConfirmLevel(false);
    showToast("Livello resettato.");
  }
  function doResetTotal() { setConfirmTotal(false); onDelete(); }
  function levelUp() {
    onUpdate((c) => {
      const hd = hitDie(c.class);
      const conMod = abilityMod(c.abilityScores.con);
      const gained = Math.max(1, Math.ceil((hd + 1) / 2) + conMod);
      const level = c.level + 1;
      return pushLog({ ...c, level, hp: { ...c.hp, max: c.hp.max + gained, current: c.hp.current + gained } }, `Livello ${level}! +${gained} PF massimi (media dado vita).`);
    });
    showToast("Sei salito di livello!");
  }
  function toggleLock() {
    onUpdate((c) => pushLog({ ...c, locked: !c.locked }, c.locked ? "Scheda sbloccata per modifiche." : "Scheda bloccata."));
  }

  return (
    <div className="sheet-screen">
      <div className="sheet-header">
        <div>
          <h1>{char.name}{char.locked ? " 🔒" : ""}</h1>
          <p className="muted">{char.race} · {char.class} · Livello {char.level}</p>
        </div>
      </div>

      <div className="btn-row">
        <button className="ghost-btn" onClick={toggleLock}>{char.locked ? "Sblocca scheda" : "Blocca scheda"}</button>
        <button className="primary-btn" onClick={levelUp} disabled={char.locked}>Sali di livello</button>
      </div>

      <nav className="tabs">
        {[["panoramica", "Panoramica"], ["attacchi", "Attacchi"], ["incantesimi", "Incantesimi"], ["inventario", "Inventario"], ["dadi", "Dadi"], ["registro", "Registro"]].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? "tab-active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === "panoramica" && <PanoramicaTab char={char} onUpdate={onUpdate} showToast={showToast} />}
      {tab === "attacchi" && <AttacchiTab char={char} onUpdate={onUpdate} showToast={showToast} />}
      {tab === "incantesimi" && <IncantesimiTab char={char} onUpdate={onUpdate} />}
      {tab === "inventario" && <InventarioTab char={char} onUpdate={onUpdate} />}
      {tab === "dadi" && <DadiTab char={char} onUpdate={onUpdate} />}
      {tab === "registro" && <RegistroTab char={char} />}

      <div className="danger-zone">
        <h3>Zona rischiosa</h3>
        <div className="btn-row">
          <button className="warn-btn" onClick={() => setConfirmLevel(true)}>Reset livello</button>
          <button className="danger-btn" onClick={() => setConfirmTotal(true)}>Reset totale</button>
        </div>
      </div>

      {confirmLevel && (
        <Modal onClose={() => setConfirmLevel(false)}>
          <h3>Confermi il reset del livello?</h3>
          <p className="muted">{char.name} tornerà al livello 1, i PF massimi verranno ricalcolati e gli slot incantesimo verranno azzerati. L'inventario e gli incantesimi conosciuti restano.</p>
          <div className="btn-row">
            <button className="ghost-btn" onClick={() => setConfirmLevel(false)}>Annulla</button>
            <button className="warn-btn" onClick={doResetLevel}>Sì, resetta il livello</button>
          </div>
        </Modal>
      )}
      {confirmTotal && (
        <Modal onClose={() => setConfirmTotal(false)}>
          <h3>Confermi l'eliminazione totale?</h3>
          <p className="muted">Questa azione elimina per sempre {char.name}, incluso lo storico. Scrivi ELIMINA per confermare.</p>
          <input className="text-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ELIMINA" />
          <div className="btn-row">
            <button className="ghost-btn" onClick={() => { setConfirmTotal(false); setConfirmText(""); }}>Annulla</button>
            <button className="danger-btn" disabled={confirmText.trim().toUpperCase() !== "ELIMINA"} onClick={doResetTotal}>Elimina per sempre</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/* ---- Panoramica ---- */

function PanoramicaTab({ char, onUpdate, showToast }) {
  const [healAmt, setHealAmt] = useState(5);
  const [dmgAmt, setDmgAmt] = useState(5);
  const pb = profBonus(char.level);

  function applyHeal() {
    onUpdate((c) => {
      const bonus = c.healBonus || 0;
      const total = Number(healAmt) + bonus;
      const current = Math.min(c.hp.max, c.hp.current + total);
      return pushLog({ ...c, hp: { ...c.hp, current } }, `Curato di ${healAmt}${bonus ? ` (+${bonus} bonus)` : ""} → ${current}/${c.hp.max} PF.`);
    });
    showToast("Cura applicata.");
  }
  function applyDamage() {
    onUpdate((c) => {
      let amount = Number(dmgAmt);
      let temp = c.hp.temp || 0;
      if (temp > 0) { if (amount <= temp) { temp -= amount; amount = 0; } else { amount -= temp; temp = 0; } }
      const current = Math.max(0, c.hp.current - amount);
      return pushLog({ ...c, hp: { ...c.hp, current, temp } }, `Subito ${dmgAmt} danni → ${current}/${c.hp.max} PF${temp ? ` (${temp} PF temporanei rimasti)` : ""}.`);
    });
    showToast("Danno applicato.");
  }
  function rollCheck(label, mod, proficient) {
    const bonus = mod + (proficient ? pb : 0);
    const roll = rollDie(20);
    const total = roll + bonus;
    onUpdate((c) => pushLog(c, `${label}: d20 (${roll}) ${fmtMod(bonus)} = ${total}`));
    showToast(`${label}: ${total} (d20: ${roll} ${fmtMod(bonus)})`);
  }

  return (
    <div className="tab-panel">
      <section className="hp-block">
        <div className="hp-label-row"><span>Punti Ferita</span><span className="muted small">{char.hp.current}/{char.hp.max}{char.hp.temp ? ` (+${char.hp.temp} temp)` : ""}</span></div>
        <div className="hp-bar"><div className="hp-bar-fill" style={{ width: `${Math.max(0, (char.hp.current / char.hp.max) * 100)}%` }} /></div>
        <div className="hp-controls">
          <input type="number" className="text-input tiny" value={healAmt} onChange={(e) => setHealAmt(e.target.value)} />
          <button className="heal-btn" onClick={applyHeal}>+ Cura</button>
          <input type="number" className="text-input tiny" value={dmgAmt} onChange={(e) => setDmgAmt(e.target.value)} />
          <button className="dmg-btn" onClick={applyDamage}>− Danno</button>
        </div>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div><label className="field-label">PF temporanei</label><input type="number" className="text-input" value={char.hp.temp || 0} onChange={(e) => onUpdate((c) => ({ ...c, hp: { ...c.hp, temp: Number(e.target.value) } }))} /></div>
          <div><label className="field-label">Bonus cura ricevuta</label><input type="number" className="text-input" value={char.healBonus || 0} onChange={(e) => onUpdate((c) => ({ ...c, healBonus: Number(e.target.value) }))} /></div>
        </div>
      </section>

      <section className="stat-strip">
        <div className="stat-chip"><span className="stat-chip-val">{char.ac}</span><span className="stat-chip-lbl">CA</span></div>
        <div className="stat-chip"><span className="stat-chip-val">{char.speed}m</span><span className="stat-chip-lbl">Velocità</span></div>
        <div className="stat-chip"><span className="stat-chip-val">{fmtMod(pb)}</span><span className="stat-chip-lbl">Competenza</span></div>
      </section>

      <h3>Caratteristiche & Prove</h3>
      <div className="ability-checks">
        {ABILITIES.map((a) => {
          const score = char.abilityScores[a.key];
          const mod = abilityMod(score);
          const isSaveProf = char.proficiencies.saves?.includes(a.key);
          return (
            <div key={a.key} className="ability-check-row">
              <div className="ability-score"><span className="ab-label">{a.label}</span><span className="ab-score">{score}</span><span className="ab-mod">{fmtMod(mod)}</span></div>
              <button className="roll-chip" onClick={() => rollCheck(a.label, mod, false)}>Prova</button>
              <button className={`roll-chip ${isSaveProf ? "roll-chip-active" : ""}`} onClick={() => rollCheck(`TS ${a.label}`, mod, isSaveProf)}>TS</button>
            </div>
          );
        })}
      </div>

      <h3>Abilità</h3>
      <div className="skill-list">
        {SKILLS.map((s) => {
          const mod = abilityMod(char.abilityScores[s.ab]);
          const proficient = char.proficiencies.skills?.includes(s.name);
          const total = mod + (proficient ? pb : 0);
          return (
            <button key={s.name} className="skill-row" onClick={() => rollCheck(s.name, mod, proficient)}>
              <span>{s.name}</span><span className="muted small">{s.ab.toUpperCase()}</span><span className={`skill-mod ${proficient ? "skill-mod-prof" : ""}`}>{fmtMod(total)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Attacchi ---- */

function AttacchiTab({ char, onUpdate, showToast }) {
  const [form, setForm] = useState({ name: "", bonus: 0, damage: "1d6", damageType: "" });
  function addAttack() {
    if (!form.name.trim() || char.locked) return;
    onUpdate((c) => ({ ...c, attacks: [...c.attacks, { ...form, bonus: Number(form.bonus) }] }));
    setForm({ name: "", bonus: 0, damage: "1d6", damageType: "" });
  }
  function removeAttack(i) { onUpdate((c) => ({ ...c, attacks: c.attacks.filter((_, idx) => idx !== i) })); }
  function attack(a) {
    const toHitRoll = rollDie(20);
    const toHitTotal = toHitRoll + Number(a.bonus);
    const dmg = parseDice(a.damage);
    const text = `${a.name}: attacco d20 (${toHitRoll}) ${fmtMod(Number(a.bonus))} = ${toHitTotal} → danno ${dmg.detail} = ${dmg.total} ${a.damageType || ""}`.trim();
    onUpdate((c) => pushLog(c, text));
    showToast(text);
  }
  return (
    <div className="tab-panel">
      {char.attacks.length === 0 && <p className="muted">Nessun attacco. Aggiungine uno qui sotto.</p>}
      <div className="attack-list">
        {char.attacks.map((a, i) => (
          <div key={i} className="attack-card">
            <div className="attack-top"><strong>{a.name}</strong>{!char.locked && <button className="icon-btn" onClick={() => removeAttack(i)}>✕</button>}</div>
            <div className="muted small">Bonus attacco {fmtMod(Number(a.bonus))}</div>
            <div className="dice-hint">Danno: {a.damage} {a.damageType} — tira questi dadi fisici se preferisci</div>
            <button className="primary-btn" onClick={() => attack(a)}>Attacca (tira per me)</button>
          </div>
        ))}
      </div>
      {!char.locked && (
        <>
          <h3>Nuovo attacco</h3>
          <div className="panel">
            <label className="field-label">Nome</label>
            <input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es: Spadone lungo" />
            <div className="grid-2">
              <div><label className="field-label">Bonus attacco</label><input type="number" className="text-input" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} /></div>
              <div><label className="field-label">Danno (es. 1d8+3)</label><input className="text-input" value={form.damage} onChange={(e) => setForm({ ...form, damage: e.target.value })} /></div>
            </div>
            <label className="field-label">Tipo di danno</label>
            <input className="text-input" value={form.damageType} onChange={(e) => setForm({ ...form, damageType: e.target.value })} placeholder="Es: tagliente" />
            <div className="btn-row"><button className="primary-btn" onClick={addAttack}>Aggiungi attacco</button></div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Incantesimi ---- */

function IncantesimiTab({ char, onUpdate }) {
  const [form, setForm] = useState({ name: "", level: 1 });
  const [explaining, setExplaining] = useState(null);
  function addSpell() {
    if (!form.name.trim() || char.locked) return;
    onUpdate((c) => ({ ...c, spells: [...c.spells, { name: form.name, level: Number(form.level), description: "" }] }));
    setForm({ name: "", level: 1 });
  }
  function removeSpell(i) { onUpdate((c) => ({ ...c, spells: c.spells.filter((_, idx) => idx !== i) })); }
  async function explain(i, spell) {
    if (spell.description) return;
    setExplaining(i);
    try {
      const text = await callAI({ prompt: `Spiega in italiano, in 3-4 frasi chiare per un giocatore a tavolino, l'incantesimo D&D 5e "${spell.name}" (livello ${spell.level}): cosa fa, tempo di lancio, portata, componenti principali se rilevanti.`, maxTokens: 300 });
      onUpdate((c) => ({ ...c, spells: c.spells.map((s, idx) => (idx === i ? { ...s, description: text.trim() } : s)) }));
    } catch (e) {
      onUpdate((c) => ({ ...c, spells: c.spells.map((s, idx) => (idx === i ? { ...s, description: e.message || "Non sono riuscito a recuperare la spiegazione." } : s)) }));
    } finally { setExplaining(null); }
  }
  function useSlot(delta) {
    onUpdate((c) => {
      const slot = c.spellSlots["1"] || { max: 2, used: 0 };
      const used = Math.min(slot.max, Math.max(0, slot.used + delta));
      return { ...c, spellSlots: { ...c.spellSlots, "1": { ...slot, used } } };
    });
  }
  const slot = char.spellSlots?.["1"] || { max: 0, used: 0 };
  return (
    <div className="tab-panel">
      <section className="slot-block">
        <span>Slot incantesimo livello 1</span>
        <div className="slot-controls">
          <button className="icon-btn" onClick={() => useSlot(1)}>Usa</button>
          <span>{slot.max - slot.used}/{slot.max} disponibili</span>
          <button className="icon-btn" onClick={() => useSlot(-1)}>Recupera</button>
        </div>
        <label className="field-label">Slot massimi</label>
        <input type="number" className="text-input" value={slot.max} onChange={(e) => onUpdate((c) => ({ ...c, spellSlots: { ...c.spellSlots, "1": { ...slot, max: Number(e.target.value) } } }))} />
      </section>

      {char.spells.length === 0 && <p className="muted">Nessun incantesimo conosciuto.</p>}
      <div className="spell-list">
        {char.spells.map((s, i) => (
          <div key={i} className="spell-card">
            <div className="attack-top"><strong>{s.name}</strong>{!char.locked && <button className="icon-btn" onClick={() => removeSpell(i)}>✕</button>}</div>
            <div className="muted small">Livello {s.level}</div>
            {s.description ? <p className="spell-desc">{s.description}</p> : <button className="ghost-btn" onClick={() => explain(i, s)} disabled={explaining === i}>{explaining === i ? "Spiego…" : "Spiega"}</button>}
          </div>
        ))}
      </div>

      {!char.locked && (
        <>
          <h3>Nuovo incantesimo</h3>
          <div className="panel">
            <label className="field-label">Nome</label>
            <input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es: Palla di fuoco" />
            <label className="field-label">Livello</label>
            <input type="number" min="0" max="9" className="text-input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
            <div className="btn-row"><button className="primary-btn" onClick={addSpell}>Aggiungi incantesimo</button></div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Inventario ---- */

function InventarioTab({ char, onUpdate }) {
  const [form, setForm] = useState({ name: "", qty: 1 });
  function addItem() {
    if (!form.name.trim() || char.locked) return;
    onUpdate((c) => ({ ...c, inventory: [...c.inventory, { name: form.name, qty: Number(form.qty) }] }));
    setForm({ name: "", qty: 1 });
  }
  function removeItem(i) { onUpdate((c) => ({ ...c, inventory: c.inventory.filter((_, idx) => idx !== i) })); }
  return (
    <div className="tab-panel">
      {char.inventory.length === 0 && <p className="muted">Inventario vuoto.</p>}
      <div className="item-list">
        {char.inventory.map((it, i) => (
          <div key={i} className="item-row"><span>{it.name}</span><span className="muted">× {it.qty}</span>{!char.locked && <button className="icon-btn" onClick={() => removeItem(i)}>✕</button>}</div>
        ))}
      </div>
      {!char.locked && (
        <div className="panel">
          <div className="grid-2">
            <div><label className="field-label">Oggetto</label><input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="field-label">Quantità</label><input type="number" className="text-input" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
          </div>
          <div className="btn-row"><button className="primary-btn" onClick={addItem}>Aggiungi oggetto</button></div>
        </div>
      )}
      <h3>Note</h3>
      <textarea className="text-input" rows={4} value={char.notes} disabled={char.locked} onChange={(e) => onUpdate((c) => ({ ...c, notes: e.target.value }))} placeholder="Note libere sul personaggio…" />
    </div>
  );
}

/* ---- Dadi ---- */

function DadiTab({ char, onUpdate }) {
  const [custom, setCustom] = useState("1d20");
  const [mode, setMode] = useState("normale");
  const [result, setResult] = useState(null);
  function rollD20WithMode() {
    const r1 = rollDie(20);
    const r2 = mode !== "normale" ? rollDie(20) : null;
    let chosen = r1;
    if (r2 !== null) chosen = mode === "vantaggio" ? Math.max(r1, r2) : Math.min(r1, r2);
    setResult({ label: `d20 (${mode})`, detail: r2 !== null ? `[${r1}, ${r2}] → ${chosen}` : `${chosen}`, total: chosen });
  }
  function rollQuick(sides) { const r = rollDie(sides); setResult({ label: `d${sides}`, detail: `${r}`, total: r }); }
  function rollCustom() { const { total, detail } = parseDice(custom); setResult({ label: custom, detail, total }); }
  return (
    <div className="tab-panel">
      <section className="dice-block">
        <h3>d20 rapido</h3>
        <div className="mode-row">{["svantaggio", "normale", "vantaggio"].map((m) => (<button key={m} className={`mode-chip ${mode === m ? "mode-chip-active" : ""}`} onClick={() => setMode(m)}>{m}</button>))}</div>
        <button className="primary-btn" onClick={rollD20WithMode}>Tira d20</button>
      </section>
      <section className="dice-block">
        <h3>Dadi rapidi</h3>
        <div className="dice-grid">{[4, 6, 8, 10, 12, 20, 100].map((s) => (<button key={s} className="dice-chip" onClick={() => rollQuick(s)}>d{s}</button>))}</div>
      </section>
      <section className="dice-block">
        <h3>Tiro personalizzato</h3>
        <div className="btn-row"><input className="text-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="es. 2d6+3" /><button className="primary-btn" onClick={rollCustom}>Tira</button></div>
      </section>
      {result && <div className="result-block"><span className="muted small">{result.label}</span><div className="result-total">{result.total}</div><span className="muted small">{result.detail}</span></div>}
    </div>
  );
}

/* ---- Registro ---- */

function RegistroTab({ char }) {
  return (
    <div className="tab-panel">
      {(!char.log || char.log.length === 0) && <p className="muted">Nessun evento registrato ancora.</p>}
      <div className="log-list">
        {(char.log || []).map((e, i) => (
          <div key={i} className="log-row"><span className="log-time">{new Date(e.ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span><span>{e.text}</span></div>
        ))}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
