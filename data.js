/* ============ DATI DI GIOCO (contenuto SRD/Basic Rules, semplificato) ============ */

const RACES = [
  { id: "umano", name: "Umano", bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 9, size: "Medio",
    traits: ["Versatile: +1 a tutte le caratteristiche"] },
  { id: "nano", name: "Nano", bonus: { con: 2 }, speed: 7, size: "Medio",
    traits: ["Scurovisione 18m", "Resistenza al veleno", "Competenza in strumenti artigiano", "Resistenza ai danni contundenti/perforanti/taglienti da armi (Nano delle Colline: +1 PF/livello)"] },
  { id: "elfo", name: "Elfo", bonus: { dex: 2 }, speed: 9, size: "Medio",
    traits: ["Scurovisione 18m", "Immune al sonno magico, vantaggio TS contro charme", "Competenza in Percezione"] },
  { id: "halfling", name: "Halfling", bonus: { dex: 2 }, speed: 7, size: "Piccolo",
    traits: ["Fortunato: rilancia gli 1 su d20", "Coraggioso: vantaggio TS contro paura", "Agilità furtiva"] },
  { id: "dragonide", name: "Draconide", bonus: { str: 2, cha: 1 }, speed: 9, size: "Medio",
    traits: ["Arma del soffio (in base alla discendenza draconica)", "Resistenza al danno di discendenza"] },
  { id: "gnomo", name: "Gnomo", bonus: { int: 2 }, speed: 7, size: "Piccolo",
    traits: ["Scurovisione 18m", "Astuzia gnomesca: vantaggio TS Int/Sag/Car contro la magia"] },
  { id: "mezzelfo", name: "Mezzelfo", bonus: { cha: 2, dex: 1, con: 1 }, speed: 9, size: "Medio",
    traits: ["Scurovisione 18m", "Immune al sonno magico, vantaggio TS contro charme", "Due competenze in abilità a scelta"] },
  { id: "mezzorco", name: "Mezzorco", bonus: { str: 2, con: 1 }, speed: 9, size: "Medio",
    traits: ["Scurovisione 18m", "Resistenza tenace (1/riposo lungo, sopravvive a 0 PF)", "Attacchi implacabili sui critici"] },
  { id: "tiefling", name: "Tiefling", bonus: { cha: 2, int: 1 }, speed: 9, size: "Medio",
    traits: ["Scurovisione 18m", "Resistenza al danno da fuoco", "Incantesimi infernali innati"] },
];

const CLASSES = [
  { id: "barbaro", name: "Barbaro", hitDie: 12, primary: "str", saves: ["str", "con"], casterType: "none", subclass: "Furia del Berserker",
    weapons: "Armi semplici e da guerra", armor: "Armature leggere e medie, scudi" },
  { id: "bardo", name: "Bardo", hitDie: 8, primary: "cha", saves: ["dex", "cha"], casterType: "full-known", spellAbility: "cha", subclass: "Collegio della Conoscenza",
    weapons: "Armi semplici, spade lunghe, rapiere, spade corte, balestre a mano", armor: "Armature leggere", cantripsL1: 2, spellsKnownL1: 4 },
  { id: "chierico", name: "Chierico", hitDie: 8, primary: "wis", saves: ["wis", "cha"], casterType: "full-prepared", spellAbility: "wis", subclass: "Domino della Vita",
    weapons: "Armi semplici", armor: "Armature leggere e medie, scudi", cantripsL1: 3 },
  { id: "druido", name: "Druido", hitDie: 8, primary: "wis", saves: ["int", "wis"], casterType: "full-prepared", spellAbility: "wis", subclass: "Circolo della Terra",
    weapons: "Bastoni, mazze, falcetti e altre armi semplici non in metallo", armor: "Armature leggere e medie non metalliche, scudi", cantripsL1: 2 },
  { id: "guerriero", name: "Guerriero", hitDie: 10, primary: "str", saves: ["str", "con"], casterType: "none", subclass: "Campione",
    weapons: "Armi semplici e da guerra", armor: "Tutte le armature, scudi" },
  { id: "monaco", name: "Monaco", hitDie: 8, primary: "dex", saves: ["str", "dex"], casterType: "none", subclass: "Via della Mano Aperta",
    weapons: "Armi semplici, spade corte", armor: "Nessuna" },
  { id: "paladino", name: "Paladino", hitDie: 10, primary: "str", saves: ["wis", "cha"], casterType: "half-prepared", spellAbility: "cha", casterStartLevel: 2, subclass: "Giuramento di Devozione",
    weapons: "Armi semplici e da guerra", armor: "Tutte le armature, scudi" },
  { id: "ramingo", name: "Ramingo", hitDie: 10, primary: "dex", saves: ["str", "dex"], casterType: "half-known", spellAbility: "wis", casterStartLevel: 2, subclass: "Cacciatore",
    weapons: "Armi semplici e da guerra", armor: "Armature leggere e medie, scudi", spellsKnownL1: 2 },
  { id: "ladro", name: "Ladro", hitDie: 8, primary: "dex", saves: ["dex", "int"], casterType: "none", subclass: "Furfante",
    weapons: "Armi semplici, spade lunghe, rapiere, spade corte, balestre a mano", armor: "Armature leggere" },
  { id: "stregone", name: "Stregone", hitDie: 6, primary: "cha", saves: ["con", "cha"], casterType: "full-known", spellAbility: "cha", subclass: "Progenie Draconica",
    weapons: "Balestre leggere, bastoni, pugnali, fionde, giavellotti", armor: "Nessuna", cantripsL1: 4, spellsKnownL1: 2 },
  { id: "warlock", name: "Warlock", hitDie: 8, primary: "cha", saves: ["wis", "cha"], casterType: "pact", spellAbility: "cha", subclass: "Patto del Diavolo",
    weapons: "Armi semplici", armor: "Armature leggere", cantripsL1: 2, spellsKnownL1: 2 },
  { id: "mago", name: "Mago", hitDie: 6, primary: "int", saves: ["int", "wis"], casterType: "full-spellbook", spellAbility: "int", subclass: "Scuola di Evocazione",
    weapons: "Balestre leggere, pugnali, dardi, fionde, bastoni", armor: "Nessuna", cantripsL1: 3, spellsKnownL1: 6 },
];

const SPELL_LISTS = {
  bardo: { cantrips: ["Vivificare", "Luci Danzanti", "Messaggero", "Trucco Sconcertante"], level1: ["Cura Ferite", "Sonno", "Fascino su Persone", "Dissonanza Psichica", "Incoraggiamento Eroico", "Individuazione della Magia"] },
  chierico: { cantrips: ["Bagliore Sacro", "Guida Divina", "Taumaturgia"], level1: ["Cura Ferite", "Benedizione", "Comando", "Scudo della Fede", "Individuazione del Male e del Bene", "Santuario"] },
  druido: { cantrips: ["Produrre Fiamma", "Resistenza agli Elementi", "Guida Druidica"], level1: ["Trappola Tonante", "Parlare con gli Animali", "Cura Ferite", "Favore della Natura", "Individuazione della Magia"] },
  paladino: { cantrips: [], level1: ["Cura Ferite", "Individuazione del Male e del Bene", "Scudo della Fede", "Protezione dal Male e dal Bene"] },
  ramingo: { cantrips: [], level1: ["Individuazione della Magia", "Trappola Tonante", "Parlare con gli Animali", "Curare Ferite"] },
  stregone: { cantrips: ["Dardo Incantato", "Raggio di Gelo", "Mano Magica", "Illusione Minore"], level1: ["Palla di Fuoco (a lvl superiori)", "Scudo", "Charme su Persone", "Dormi", "Ragnatela"] },
  warlock: { cantrips: ["Dardo Incantato", "Mano Magica", "Illusione Minore"], level1: ["Maledizione", "Charme su Persone", "Ombre Vivide", "Terrore Fatato"] },
  mago: { cantrips: ["Dardo Incantato", "Mano Magica", "Illusione Minore", "Raggio di Gelo", "Luce"], level1: ["Palla di Fuoco (livelli sup.)", "Scudo", "Dormi", "Ragnatela", "Individuazione della Magia", "Charme su Persone"] },
};

// Tabella slot incantesimo, caster completo (livello -> [slot1..slot9])
const FULL_CASTER_SLOTS = {
  1: [2,0,0,0,0,0,0,0,0], 2: [3,0,0,0,0,0,0,0,0], 3: [4,2,0,0,0,0,0,0,0], 4: [4,3,0,0,0,0,0,0,0],
  5: [4,3,2,0,0,0,0,0,0], 6: [4,3,3,0,0,0,0,0,0], 7: [4,3,3,1,0,0,0,0,0], 8: [4,3,3,2,0,0,0,0,0],
  9: [4,3,3,3,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0],
  13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0],
  17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1],
};
// Semi-caster (Paladino, Ramingo): approssimazione = tabella completa scalata a metà livello
function halfCasterSlots(level) {
  if (level < 2) return [0,0,0,0,0,0,0,0,0];
  return FULL_CASTER_SLOTS[Math.max(1, Math.floor(level / 2))];
}
// Warlock (slot patto)
const PACT_SLOTS = {
  1:{n:1,lvl:1}, 2:{n:2,lvl:1}, 3:{n:2,lvl:2}, 4:{n:2,lvl:2}, 5:{n:2,lvl:3}, 6:{n:2,lvl:3},
  7:{n:2,lvl:4}, 8:{n:2,lvl:4}, 9:{n:2,lvl:5}, 10:{n:2,lvl:5}, 11:{n:3,lvl:5}, 12:{n:3,lvl:5},
  13:{n:3,lvl:5}, 14:{n:3,lvl:5}, 15:{n:3,lvl:5}, 16:{n:3,lvl:5}, 17:{n:4,lvl:5}, 18:{n:4,lvl:5},
  19:{n:4,lvl:5}, 20:{n:4,lvl:5},
};

function computeSlotsForClass(classId, level) {
  const cls = CLASSES.find((c) => c.id === classId);
  if (!cls) return { type: "none" };
  if (cls.casterType === "full-known" || cls.casterType === "full-prepared" || cls.casterType === "full-spellbook") {
    return { type: "levels", slots: FULL_CASTER_SLOTS[Math.min(20, Math.max(1, level))] };
  }
  if (cls.casterType === "half-known" || cls.casterType === "half-prepared") {
    return { type: "levels", slots: halfCasterSlots(level) };
  }
  if (cls.casterType === "pact") {
    return { type: "pact", pact: PACT_SLOTS[Math.min(20, Math.max(1, level))] };
  }
  return { type: "none" };
}

const ASI_LEVELS = [4, 8, 12, 16, 19];
