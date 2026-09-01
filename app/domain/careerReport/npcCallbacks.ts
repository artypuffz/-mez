import type { GameState } from "../state/types";

export interface NpcCallback {
  npcId: string;
  name: string;
  line: string;
}

// Phase 10 §16 — a handful of the career's most notable relationships,
// never raw numbers. Authored template characters (Barış, Zeynep, Erhan,
// Deniz) get dedicated flavor per relationship tier when they're present
// in the roster; procedural NPCs get one generic high-affinity slot and,
// only if it's actually notable, one high-grudge slot.
const TEMPLATE_LINES: Record<string, { good: string; neutral: string; bad: string }> = {
  baris: {
    good: "Aranız iyi kaldı.",
    neutral: "Ne yakın ne uzak — sıradan bir meslektaş oldunuz.",
    bad: "Aranız hiç açılmadı.",
  },
  zeynep_sekreter: {
    good: "Son form hâlâ onda olabilir.",
    neutral: "Penceresinin önünden geçerken baş sallıyorsunuz, o kadar.",
    bad: "Sekreterlik penceresinde artık sadece iş konuşuyorsunuz.",
  },
  hoca_erhan: {
    good: "Seninle hâlâ zaman zaman konuşuyor.",
    neutral: "Aynı koridorda karşılaşıyorsunuz, o kadar.",
    bad: "Aranızdaki mesafe hiç kapanmadı.",
  },
  deniz_comez: {
    good: "Uzman olduğunda sana mesaj attı.",
    neutral: "Artık ayrı serviste, pek görüşmüyorsunuz.",
    bad: "Aranızda hâlâ bir gerginlik var.",
  },
};

function tier(trust: number, friendship: number, grudge: number): "good" | "neutral" | "bad" {
  if (grudge >= 30) return "bad";
  if (trust + friendship >= 20) return "good";
  return "neutral";
}

export function selectNpcCallbacks(state: GameState, limit = 3): NpcCallback[] {
  const callbacks: NpcCallback[] = [];

  const templateEntries = Object.values(state.npcs).filter((npc) => npc.templateId && TEMPLATE_LINES[npc.templateId]);
  for (const npc of templateEntries) {
    const rel = state.relationships[npc.id] ?? { trust: 0, friendship: 0, grudge: 0 };
    const lines = TEMPLATE_LINES[npc.templateId!];
    callbacks.push({ npcId: npc.id, name: npc.identity.name, line: lines[tier(rel.trust, rel.friendship, rel.grudge)] });
  }

  const templateIds = new Set(templateEntries.map((n) => n.id));
  const proceduralEntries = Object.entries(state.relationships).filter(([id]) => !templateIds.has(id) && state.npcs[id]);

  const remaining = Math.max(0, limit - callbacks.length);
  if (remaining > 0 && proceduralEntries.length > 0) {
    const byAffinity = [...proceduralEntries].sort((a, b) => (b[1].trust + b[1].friendship) - (a[1].trust + a[1].friendship));
    const [topId, topRel] = byAffinity[0];
    if (topRel.trust + topRel.friendship >= 15) {
      callbacks.push({ npcId: topId, name: state.npcs[topId].identity.name, line: "Aranız iyi kaldı." });
    }
  }

  const remaining2 = Math.max(0, limit - callbacks.length);
  if (remaining2 > 0 && proceduralEntries.length > 0) {
    const byGrudge = [...proceduralEntries].sort((a, b) => b[1].grudge - a[1].grudge);
    const [topId, topRel] = byGrudge[0];
    if (topRel.grudge >= 30 && !callbacks.some((c) => c.npcId === topId)) {
      callbacks.push({ npcId: topId, name: state.npcs[topId].identity.name, line: "Aranızda hâlâ bir şeyler var." });
    }
  }

  return callbacks.slice(0, limit);
}
