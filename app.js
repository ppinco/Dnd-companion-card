/* ============ PARTE 1: STATE & DATA ============ */
const ABILITIES = [
  { key: "str", label: "Forza" },
  { key: "dex", label: "Destrezza" },
  { key: "con", label: "Costituzione" },
  { key: "int", label: "Intelligenza" },
  { key: "wis", label: "Saggezza" },
  { key: "cha", label: "Carisma" }
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
  { name: "Persuasione", ab: "cha" }
];

let state = {
  characters: [],
  screen: "list",
  activeId: null,
  activeTab: "panoramica",
  toast: null,
  createMethod: null,
  createLoading: false,
  createError: "",
  diceMode: "normale",
  diceResult: null
};

function loadStorage() {
  try {
    const data = localStorage.getItem("dnd_companion_v5");
    state.characters = data ? JSON.parse(data) : [];
  } catch (e) {
    state.characters = [];
  }
}
/* ============ PARTE 2: CORE RENDER & CREATION ============ */
function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const active = state.characters.find(function(c) { return c.id === state.activeId; });

  let html = '<header class="topbar"><div class="brand"><span class="brand-mark">⚔</span><span class="brand-name">Compagno d\'Avventura</span></div>';
  if (state.screen !== "list") {
    html += '<button class="ghost-btn" onclick="setScreen(\'list\')">← Personaggi</button>';
  }
  html += '</header><main class="content">';

  if (state.screen === "list") html += renderList();
  else if (state.screen === "create") html += renderCreate();
  else if (state.screen === "sheet" && active) html += renderSheet(active);

  html += '</main>';
  if (state.toast) html += '<div class="toast">' + state.toast + '</div>';

  app.innerHTML = html;
}

function setScreen(s) {
  state.screen = s;
  state.createMethod = null;
  state.createError = "";
  render();
}

function renderList() {
  let html = '<div class="list-screen"><div class="list-header"><h1>I tuoi personaggi</h1><button class="primary-btn" onclick="setScreen(\'create\')">+ Nuovo personaggio</button></div>';
  if (state.characters.length === 0) {
    html += '<div class="empty"><p>Nessun personaggio salvato.</p><p class="muted">Crealo manuale, da descrizione IA o scansionando una scheda.</p></div>';
  }
  html += '<div class="card-grid">';
  state.characters.forEach(function(c) {
    const hpPct = Math.max(0, (c.hp.current / c.hp.max) * 100);
    html += '<button class="char-card" onclick="openSheet(\'' + c.id + '\')"><div class="char-card-top"><span class="char-name">' + c.name + '</span><span class="char-level">Lv ' + c.level + '</span></div><div class="char-sub">' + c.race + ' · ' + c.class + '</div><div class="hp-mini"><div class="hp-mini-fill" style="width: ' + hpPct + '%"></div></div><div class="char-sub muted">' + c.hp.current + '/' + c.hp.max + ' PF ' + (c.hp.temp ? '(+' + c.hp.temp + ' Temp)' : '') + '</div></button>';
  });
  html += '</div></div>';
  return html;
}

function openSheet(id) {
  state.activeId = id;
  state.screen = "sheet";
  render();
}

function renderCreate() {
  let html = '<div class="create-screen"><h1>Nuovo personaggio</h1>';
  if (!state.createMethod) {
    html += '<div class="method-grid">' +
      '<button class="method-card" onclick="setCreateMethod(\'manual\')"><span class="method-icon">✎</span><span>Manuale</span></button>' +
      '<button class="method-card" onclick="setCreateMethod(\'desc\')"><span class="method-icon">📜</span><span>Da Descrizione (es: Thor)</span></button>' +
      '<button class="method-card" onclick="setCreateMethod(\'scan\')"><span class="method-icon">📷</span><span>Fotocamera / Foto</span></button>' +
      '</div>';
  } else if (state.createMethod === 'manual') html += renderManualForm();
  else if (state.createMethod === 'desc') html += renderAiForm();
  else if (state.createMethod === 'scan') html += renderScanForm();

  if (!state.createMethod) {
    html += '<div class="btn-row" style="margin-top:16px;"><button class="ghost-btn" onclick="setScreen(\'list\')">Annulla</button></div>';
  }
  html += '</div>';
  return html;
}

function setCreateMethod(m) { state.createMethod = m; state.createError = ""; render(); }

function renderManualForm() {
  return '<div class="panel"><label class="field-label">Nome</label><input id="m_name" class="text-input" placeholder="Es: Thorin" />' +
    '<div class="grid-2"><div><label class="field-label">Razza</label><input id="m_race" class="text-input" /></div><div><label class="field-label">Classe</label><input id="m_class" class="text-input" /></div></div>' +
    '<div class="grid-2"><div><label class="field-label">CA</label><input id="m_ac" type="number" value="10" class="text-input" /></div><div><label class="field-label">PF max</label><input id="m_hp" type="number" value="10" class="text-input" /></div></div>' +
    '<div class="btn-row"><button class="ghost-btn" onclick="setCreateMethod(null)">Indietro</button><button class="primary-btn" onclick="submitManual()">Crea personaggio</button></div></div>';
}

function submitManual() {
  const name = document.getElementById("m_name").value;
  if (!name.trim()) return;
  addCharacter(normalizeCharacter({
    name: name,
    race: document.getElementById("m_race").value || "Umano",
    class: document.getElementById("m_class").value || "Guerriero",
    ac: Number(document.getElementById("m_ac").value),
    hpMax: Number(document.getElementById("m_hp").value)
  }));
}

function renderAiForm() {
  let html = '<div class="panel"><label class="field-label">Descrizione personaggio o Eroe famoso</label><textarea id="ai_desc" class="text-input" rows="3" placeholder="Es: Crea un personaggio forte come Thor, dio del tuono..."></textarea>';
  if (state.createError) html += '<p class="error-text">' + state.createError + '</p>';
  html += '<div class="btn-row"><button class="ghost-btn" onclick="setCreateMethod(null)">Indietro</button><button class="primary-btn" ' + (state.createLoading ? "disabled" : "") + ' onclick="generateAiChar()">' + (state.createLoading ? "Genero..." : "Genera con IA") + '</button></div></div>';
  return html;
}

async function generateAiChar() {
  const desc = document.getElementById("ai_desc").value;
  if (!desc.trim()) { state.createError = "Scrivi una descrizione."; render(); return; }
  state.createLoading = true; state.createError = ""; render();
  try {
    const text = await callAI("Crea un personaggio D&D 5e basato su: \"" + desc + "\".\n" + SCHEMA_HINT);
    addCharacter(normalizeCharacter(extractJson(text)));
  } catch (e) {
    state.createError = "Errore generazione IA. Riprova.";
  } finally {
    state.createLoading = false; render();
  }
}

function renderScanForm() {
  return '<div class="panel"><p class="muted">Scatta una foto con la fotocamera posteriore o sceglila dalla galleria.</p>' +
    '<input type="file" accept="image/*" capture="environment" class="text-input" onchange="handleScan(this)" />' +
    (state.createLoading ? '<p class="muted">Analizzo scheda...</p>' : '') +
    (state.createError ? '<p class="error-text">' + state.createError + '</p>' : '') +
    '<div class="btn-row"><button class="ghost-btn" onclick="setCreateMethod(null)">Indietro</button></div></div>';
}

async function handleScan(input) {
  const file = input.files[0];
  if (!file) return;
  state.createLoading = true; state.createError = ""; render();
  const reader = new FileReader();
  reader.onload = async function() {
    try {
      const text = await callAI("Estrai dati scheda D&D e rispondi in JSON.\n" + SCHEMA_HINT, reader.result);
      addCharacter(normalizeCharacter(extractJson(text)));
    } catch (e) {
      state.createError = "Foto non letta correttamente.";
    } finally {
      state.createLoading = false; render();
    }
  };
  reader.readAsDataURL(file);
}

function addCharacter(char) {
  state.characters.push(char);
  saveStorage();
  state.activeId = char.id;
  state.screen = "sheet";
  showToast(char.name + " salvato!");
}
/* ============ PARTE 3: SHEET TABS, COMBAT & REST ============ */
function renderSheet(char) {
  const tabs = [
    ["panoramica", "Panoramica"], ["attacchi", "Attacchi"], ["incantesimi", "Incantesimi"],
    ["inventario", "Inventario"], ["dadi", "Dadi"], ["registro", "Registro"]
  ];
  let html = '<div class="sheet-screen"><div class="sheet-header"><div><h1>' + char.name + '</h1><p class="muted">' + char.race + ' · ' + char.class + ' (Lv ' + char.level + ')</p></div>' +
    '<div class="btn-row" style="margin-top:6px;"><button class="heal-btn" onclick="longRest(\'' + char.id + '\')">🌙 Riposo Lungo</button><button class="ghost-btn" onclick="shortRest(\'' + char.id + '\')">☕ Riposo Breve</button></div></div>';
  html += '<nav class="tabs">';
  tabs.forEach(function(t) {
    html += '<button class="tab ' + (state.activeTab === t[0] ? 'tab-active' : '') + '" onclick="setTab(\'' + t[0] + '\')">' + t[1] + '</button>';
  });
  html += '</nav>';

  if (state.activeTab === 'panoramica') html += renderPanoramica(char);
  else if (state.activeTab === 'attacchi') html += renderAttacchi(char);
  else if (state.activeTab === 'incantesimi') html += renderIncantesimi(char);
  else if (state.activeTab === 'inventario') html += renderInventario(char);
  else if (state.activeTab === 'dadi') html += renderDadi();
  else if (state.activeTab === 'registro') html += renderRegistro(char);

  html += '<div class="danger-zone"><h3>Gestione Personaggio</h3><div class="btn-row">' +
    '<button class="primary-btn" onclick="levelUp(\'' + char.id + '\')">⬆ Sali di Livello</button>' +
    '<button class="danger-btn" onclick="deleteChar(\'' + char.id + '\')">Elimina</button></div></div></div>';
  return html;
}

function setTab(t) { state.activeTab = t; render(); }

function renderPanoramica(char) {
  const pb = profBonus(char.level);
  const hpPct = Math.max(0, (char.hp.current / char.hp.max) * 100);
  let html = '<div class="tab-panel"><section class="hp-block"><div class="hp-label-row"><span>Punti Ferita</span><span class="muted small">' + char.hp.current + '/' + char.hp.max + (char.hp.temp ? ' (+' + char.hp.temp + ' Temp)' : '') + '</span></div>' +
    '<div class="hp-bar"><div class="hp-bar-fill" style="width: ' + hpPct + '%"></div></div>' +
    '<div class="hp-controls"><input id="hp_val" type="number" value="5" class="text-input tiny" /><button class="heal-btn" onclick="applyHeal(\'' + char.id + '\')">+ Cura</button><button class="dmg-btn" onclick="applyDmg(\'' + char.id + '\')">− Danno</button><button class="ghost-btn" onclick="applyTempHp(\'' + char.id + '\')">+ PF Temp</button></div></section>' +
    '<section class="stat-strip"><div class="stat-chip"><span class="stat-chip-val">' + char.ac + '</span><span class="stat-chip-lbl">CA</span></div><div class="stat-chip"><span class="stat-chip-val">' + char.speed + 'm</span><span class="stat-chip-lbl">Velocità</span></div><div class="stat-chip"><span class="stat-chip-val">' + fmtMod(pb) + '</span><span class="stat-chip-lbl">Competenza</span></div></section>' +
    '<h3>Caratteristiche & Tiri Salvezza</h3><div class="ability-checks">';

  ABILITIES.forEach(function(a) {
    const score = char.abilityScores[a.key];
    const mod = abilityMod(score);
    const isSave = char.proficiencies.saves && char.proficiencies.saves.indexOf(a.key) !== -1;
    html += '<div class="ability-check-row"><div class="ability-score"><span class="ab-label">' + a.label + '</span><span class="ab-mod">' + fmtMod(mod) + '</span></div>' +
      '<button class="roll-chip" onclick="rollCheck(\'' + char.id + '\', \'' + a.label + '\', ' + mod + ')">Prova</button>' +
      '<button class="roll-chip ' + (isSave ? 'roll-chip-active' : '') + '" onclick="rollCheck(\'' + char.id + '\', \'TS ' + a.label + '\', ' + (mod + (isSave ? pb : 0)) + ')">TS ' + (isSave ? '★' : '') + '</button></div>';
  });

  html += '</div></div>';
  return html;
}

function applyHeal(id) {
  const val = Number(document.getElementById("hp_val").value) || 0;
  updateChar(id, function(c) {
    const current = Math.min(c.hp.max, c.hp.current + val);
    return pushLog(c, "Curato di " + val + " PF.");
  });
}

function applyDmg(id) {
  const val = Number(document.getElementById("hp_val").value) || 0;
  updateChar(id, function(c) {
    let dmg = val;
    let temp = c.hp.temp || 0;
    if (temp > 0) {
      if (dmg <= temp) { temp -= dmg; dmg = 0; }
      else { dmg -= temp; temp = 0; }
    }
    const current = Math.max(0, c.hp.current - dmg);
    return pushLog(c, "Subito " + val + " danni.");
  });
}

function applyTempHp(id) {
  const val = Number(document.getElementById("hp_val").value) || 0;
  updateChar(id, function(c) {
    return pushLog(Object.assign({}, c, { hp: Object.assign({}, c.hp, { temp: val }) }), "Aggiunti " + val + " PF Temp.");
  });
}

function longRest(id) {
  updateChar(id, function(c) {
    const slots = Object.assign({}, c.spellSlots);
    Object.keys(slots).forEach(function(k) { slots[k].used = 0; });
    return pushLog(Object.assign({}, c, { hp: { max: c.hp.max, current: c.hp.max, temp: 0 }, spellSlots: slots }), "Riposo Lungo effettuato: PF e Slot ricaricati!");
  });
  showToast("Riposo Lungo completato!");
}

function shortRest(id) {
  updateChar(id, function(c) {
    return pushLog(c, "Riposo Breve effettuato.");
  });
  showToast("Riposo Breve fatto!");
}

function rollCheck(id, label, bonus) {
  const roll = rollDie(20);
  const total = roll + bonus;
  updateChar(id, function(c) { return pushLog(c, label + ": d20 (" + roll + ") " + fmtMod(bonus) + " = " + total); });
  showToast(label + ": " + total);
}

function renderAttacchi(char) {
  let html = '<div class="tab-panel"><div class="attack-list">';
  char.attacks.forEach(function(a, i) {
    html += '<div class="attack-card"><div class="attack-top"><strong>' + a.name + '</strong><span class="attack-dice-tag">⚔ ' + a.damage + '</span></div>' +
      '<div class="muted small">Bonus: ' + fmtMod(a.bonus) + '</div>' +
      '<button class="primary-btn" style="margin-top:8px;width:100%;" onclick="execAttack(\'' + char.id + '\', ' + i + ')">Attacca</button></div>';
  });
  html += '</div></div>';
  return html;
}

function execAttack(id, index) {
  const c = state.characters.find(function(x) { return x.id === id; });
  const a = c.attacks[index];
  const roll = rollDie(20);
  const toHit = roll + Number(a.bonus);
  const dmg = parseDice(a.damage);
  const msg = a.name + ": Tiro (" + roll + ") " + fmtMod(a.bonus) + " = " + toHit + " | Danno: " + dmg.total + " [" + dmg.detail + "]";
  updateChar(id, function(char) { return pushLog(char, msg); });
  showToast(msg);
}

function renderIncantesimi(char) {
  let html = '<div class="tab-panel"><h3>Slot Incantesimi</h3><div class="slot-block">';
  const slots = char.spellSlots || { "1": { max: 2, used: 0 } };
  Object.keys(slots).forEach(function(lvl) {
    const s = slots[lvl];
    html += '<div class="slot-controls"><span>Livello ' + lvl + ': ' + (s.max - s.used) + '/' + s.max + ' rimanenti</span>' +
      '<button class="ghost-btn" onclick="useSlot(\'' + char.id + '\', \'' + lvl + '\')">Usa Slot</button></div>';
  });
  html += '</div><div class="spell-list" style="margin-top:14px;">';
  char.spells.forEach(function(s) {
    html += '<div class="spell-card"><strong>' + s.name + '</strong> (Livello ' + s.level + ')</div>';
  });
  html += '</div></div>';
  return html;
}

function useSlot(id, lvl) {
  updateChar(id, function(c) {
    const slots = Object.assign({}, c.spellSlots);
    if (slots[lvl] && slots[lvl].used < slots[lvl].max) {
      slots[lvl].used += 1;
      return pushLog(Object.assign({}, c, { spellSlots: slots }), "Usato slot incantesimo di livello " + lvl);
    }
    return c;
  });
}

function renderInventario(char) {
  let html = '<div class="tab-panel"><div class="item-list">';
  char.inventory.forEach(function(it) {
    html += '<div class="item-row"><span>' + it.name + '</span><span class="muted">× ' + it.qty + '</span></div>';
  });
  html += '</div></div>';
  return html;
}

function renderDadi() {
  return '<div class="tab-panel"><div class="dice-grid">' +
    [4,6,8,10,12,20,100].map(function(s) { return '<button class="dice-chip" onclick="rollQuickDice(' + s + ')">d' + s + '</button>'; }).join("") +
    '</div>' + (state.diceResult ? '<div class="result-block"><div class="result-total">' + state.diceResult + '</div></div>' : '') + '</div>';
}

function rollQuickDice(s) {
  state.diceResult = rollDie(s);
  render();
}

function renderRegistro(char) {
  let html = '<div class="tab-panel"><div class="log-list">';
  (char.log || []).forEach(function(e) {
    html += '<div class="log-row"><span class="log-time">' + new Date(e.ts).toLocaleTimeString("it-IT", {hour:'2-digit', minute:'2-digit'}) + '</span><span>' + e.text + '</span></div>';
  });
  html += '</div></div>';
  return html;
}

function levelUp(id) {
  updateChar(id, function(c) {
    const nextLvl = c.level + 1;
    return pushLog(Object.assign({}, c, {
      level: nextLvl,
      hp: { max: c.hp.max + 6, current: c.hp.current + 6, temp: c.hp.temp || 0 }
    }), "Avanzato al Livello " + nextLvl);
  });
  showToast("Livello Aumentato!");
}

function deleteChar(id) {
  if (!confirm("Eliminare definitivamente?")) return;
  state.characters = state.characters.filter(function(c) { return c.id !== id; });
  saveStorage();
  setScreen("list");
}

window.addEventListener("DOMContentLoaded", function() {
  loadStorage();
  render();
});

function saveStorage() {
  localStorage.setItem("dnd_companion_v5", JSON.stringify(state.characters));
}

function showToast(msg) {
  state.toast = msg;
  render();
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(function() { state.toast = null; render(); }, 2600);
}

function updateChar(id, fn) {
  state.characters = state.characters.map(function(c) { return c.id === id ? fn(c) : c; });
  saveStorage();
  render();
}
