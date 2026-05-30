// The tech tree: a prereq DAG spanning near-term breakthroughs (robotics,
// biology, longevity) through the far future (quantum, Dyson swarms, warp/FTL).
// Techs are bought with accumulated Research Points and grant permanent effects.

import type { GameState, Tech, TechCategory } from './types';

export const TECH_CATEGORY_META: Record<
  TechCategory,
  { label: string; color: string }
> = {
  ai: { label: 'AI / Compute', color: '#e65a8c' },
  robotics: { label: 'Robotics', color: '#5aa9e6' },
  biology: { label: 'Biology', color: '#5ad19a' },
  longevity: { label: 'Longevity', color: '#7ee6c1' },
  energy: { label: 'Energy', color: '#e6c75a' },
  materials: { label: 'Materials', color: '#b98ce6' },
  quantum: { label: 'Quantum', color: '#8e9cff' },
  space: { label: 'Space', color: '#5ae6d8' },
  exotic: { label: 'Exotic Physics', color: '#ff9ec2' },
  governance: { label: 'Governance', color: '#e69a5a' },
};

export const TECHS: Tech[] = [
  // --- AI / Compute ---
  { id: 'better-accelerators', name: 'Next-Gen Accelerators', category: 'ai', tier: 1, cost: 40, prereqs: [], flavor: 'Custom silicon squeezes more from every watt.', onUnlock: { compute: 20 }, modifiers: { computeCostMult: 0.85 } },
  { id: 'scaffolded-agents', name: 'Scaffolded Agents', category: 'ai', tier: 2, cost: 80, prereqs: [], requiresCapability: 25, flavor: 'Models that plan, call tools, and act on their own.', perTick: { capability: 0.8, autonomy: 1.2 }, onUnlock: { capital: 20 } },
  { id: 'interpretability', name: 'Mechanistic Interpretability', category: 'ai', tier: 2, cost: 80, prereqs: [], flavor: 'You can finally read the model’s mind.', perTick: { alignment: 1.0 } },
  { id: 'neuromorphic', name: 'Neuromorphic Chips', category: 'ai', tier: 2, cost: 90, prereqs: ['better-accelerators'], requiresCapability: 30, flavor: 'Brain-like hardware sips power.', onUnlock: { compute: 30 }, modifiers: { capabilityMult: 1.1 } },
  { id: 'rsi-loop', name: 'Recursive Self-Improvement', category: 'ai', tier: 3, cost: 150, prereqs: ['scaffolded-agents'], requiresCapability: 40, flavor: 'The model rewrites itself, faster each cycle.', perTick: { capability: 1.6, autonomy: 1.5, alignment: -0.5 } },
  { id: 'scalable-oversight', name: 'Scalable Oversight', category: 'ai', tier: 3, cost: 160, prereqs: ['interpretability'], requiresCapability: 45, flavor: 'AIs that help you supervise smarter AIs.', onUnlock: { alignment: 6 }, perTick: { alignment: 1.6 } },
  { id: 'reversible-computing', name: 'Reversible Computing', category: 'ai', tier: 4, cost: 200, prereqs: ['neuromorphic'], requiresCapability: 60, flavor: 'Computation that barely spends energy.', modifiers: { energyCostMult: 0.7, capabilityMult: 1.1 } },

  // --- Robotics ---
  { id: 'teleoperation', name: 'Teleoperation Fleets', category: 'robotics', tier: 1, cost: 35, prereqs: [], flavor: 'Human-piloted robots do real work.', perTick: { capital: 3 } },
  { id: 'humanoid-labor', name: 'Humanoid Labor', category: 'robotics', tier: 2, cost: 100, prereqs: ['teleoperation'], requiresCapability: 35, flavor: 'General-purpose robots enter the workforce.', onUnlock: { influence: 4 }, perTick: { capital: 8, talent: 1 } },
  { id: 'lights-out-factories', name: 'Lights-Out Factories', category: 'robotics', tier: 3, cost: 190, prereqs: ['humanoid-labor'], requiresCapability: 55, flavor: 'Factories that run themselves in the dark.', perTick: { capital: 14 }, modifiers: { marketMult: 1.2 } },
  { id: 'self-replicating-robots', name: 'Self-Replicating Robots', category: 'robotics', tier: 4, cost: 320, prereqs: ['lights-out-factories'], requiresCapability: 75, flavor: 'Machines that build more machines.', perTick: { capital: 25, energy: 5, autonomy: 2 } },

  // --- Biology ---
  { id: 'ai-protein-design', name: 'AI Protein Design', category: 'biology', tier: 1, cost: 45, prereqs: [], flavor: 'Design proteins to order.', onUnlock: { influence: 3 }, perTick: { research: 2 } },
  { id: 'programmable-cells', name: 'Programmable Cells', category: 'biology', tier: 2, cost: 110, prereqs: ['ai-protein-design'], requiresCapability: 40, flavor: 'Living cells as programmable machines.', onUnlock: { influence: 8 } },
  { id: 'cure-diseases', name: 'Cure Major Diseases', category: 'biology', tier: 3, cost: 200, prereqs: ['programmable-cells'], requiresCapability: 55, flavor: 'Cancer, Alzheimer’s, the rest — solved.', onUnlock: { influence: 18, openness: 5 } },

  // --- Longevity ---
  { id: 'senolytics', name: 'Senolytic Therapies', category: 'longevity', tier: 2, cost: 120, prereqs: ['ai-protein-design'], requiresCapability: 40, flavor: 'Clear out the cells that make us age.', onUnlock: { influence: 6 } },
  { id: 'epigenetic-reprogramming', name: 'Epigenetic Reprogramming', category: 'longevity', tier: 3, cost: 220, prereqs: ['senolytics'], requiresCapability: 60, flavor: 'Reset biological age.', onUnlock: { influence: 12 } },
  { id: 'negligible-senescence', name: 'Negligible Senescence', category: 'longevity', tier: 4, cost: 360, prereqs: ['epigenetic-reprogramming'], requiresCapability: 80, flavor: 'Aging becomes optional.', onUnlock: { influence: 25, openness: 5 } },

  // --- Energy ---
  { id: 'smr-fission', name: 'Small Modular Reactors', category: 'energy', tier: 1, cost: 50, prereqs: [], flavor: 'Factory-built fission, sited anywhere.', onUnlock: { energy: 40 }, perTick: { energy: 2 } },
  { id: 'fusion', name: 'Fusion Ignition', category: 'energy', tier: 2, cost: 140, prereqs: ['smr-fission'], requiresCapability: 45, flavor: 'Net-positive fusion, at last.', onUnlock: { energy: 80 }, modifiers: { energyCostMult: 0.6 } },
  { id: 'antimatter', name: 'Antimatter Containment', category: 'energy', tier: 4, cost: 380, prereqs: ['fusion'], requiresCapability: 80, flavor: 'The densest energy storage physics allows.', onUnlock: { energy: 200 } },

  // --- Materials ---
  { id: 'room-temp-superconductors', name: 'Room-Temp Superconductors', category: 'materials', tier: 2, cost: 120, prereqs: [], requiresCapability: 40, flavor: 'Lossless power and wiring, everywhere.', modifiers: { energyCostMult: 0.85, computeCostMult: 0.9 } },
  { id: 'programmable-matter', name: 'Programmable Matter', category: 'materials', tier: 3, cost: 240, prereqs: ['room-temp-superconductors'], requiresCapability: 65, flavor: 'Matter that reshapes on command.', perTick: { capital: 10, research: 3 } },

  // --- Quantum ---
  { id: 'nisq', name: 'NISQ Processors', category: 'quantum', tier: 2, cost: 100, prereqs: [], requiresCapability: 35, flavor: 'Noisy quantum machines, but useful ones.', perTick: { research: 4 } },
  { id: 'fault-tolerant-qc', name: 'Fault-Tolerant QC', category: 'quantum', tier: 3, cost: 220, prereqs: ['nisq'], requiresCapability: 60, flavor: 'Error-corrected qubits at scale.', modifiers: { researchMult: 1.3, capabilityMult: 1.15 } },
  { id: 'quantum-training', name: 'Quantum-Accelerated Training', category: 'quantum', tier: 4, cost: 360, prereqs: ['fault-tolerant-qc'], requiresCapability: 78, flavor: 'Quantum speedups for the next frontier model.', perTick: { capability: 2 }, modifiers: { capabilityMult: 1.25 } },

  // --- Space ---
  { id: 'reusable-lift', name: 'Reusable Heavy Lift', category: 'space', tier: 2, cost: 110, prereqs: [], requiresCapability: 40, flavor: 'Orbit gets cheap.', perTick: { capital: 5 } },
  { id: 'orbital-datacenters', name: 'Orbital Datacenters', category: 'space', tier: 3, cost: 240, prereqs: ['reusable-lift'], requiresCapability: 65, flavor: 'Unlimited cooling, endless sun.', onUnlock: { compute: 60 }, modifiers: { energyCostMult: 0.85 } },
  { id: 'dyson-swarm', name: 'Dyson Swarm', category: 'space', tier: 5, cost: 600, prereqs: ['orbital-datacenters'], requiresCapability: 90, flavor: 'Harvest a meaningful fraction of a star.', onUnlock: { energy: 1000, compute: 200 }, perTick: { capital: 40 } },

  // --- Exotic Physics ---
  { id: 'warp-metric-theory', name: 'Warp Metric Theory', category: 'exotic', tier: 4, cost: 400, prereqs: ['fault-tolerant-qc'], requiresCapability: 85, flavor: 'The math of bending spacetime checks out.', perTick: { research: 8 } },
  { id: 'alcubierre-prototype', name: 'Alcubierre Prototype', category: 'exotic', tier: 5, cost: 700, prereqs: ['warp-metric-theory'], requiresCapability: 95, flavor: 'A bubble of warped space — it holds.', onUnlock: { influence: 20 } },
  { id: 'ftl-travel', name: 'Faster-Than-Light Travel', category: 'exotic', tier: 5, cost: 900, prereqs: ['alcubierre-prototype'], requiresCapability: 98, flavor: 'The stars are suddenly within reach.', onUnlock: { influence: 30, openness: 10 } },

  // --- Governance ---
  { id: 'transparency-norms', name: 'Transparency Norms', category: 'governance', tier: 1, cost: 40, prereqs: [], flavor: 'Open reporting builds public trust.', onUnlock: { openness: 8, influence: 4 } },
  { id: 'ai-constitution', name: 'AI Constitution', category: 'governance', tier: 3, cost: 160, prereqs: ['transparency-norms'], requiresCapability: 45, flavor: 'Codified rights and limits for AI and people.', perTick: { alignment: 1, openness: 1 } },
  { id: 'surveillance-apparatus', name: 'Surveillance Apparatus', category: 'governance', tier: 2, cost: 80, prereqs: [], requiresCapability: 30, flavor: 'Total monitoring — control bought with freedom.', onUnlock: { alignment: 6, openness: -15 }, perTick: { tension: -1 } },
  { id: 'global-pause-treaty', name: 'Global Pause Treaty', category: 'governance', tier: 3, cost: 150, prereqs: [], requiresCapability: 35, flavor: 'The powers agree to halt the frontier — for now.', relinquish: true, onUnlock: { tension: -20 }, perTick: { tension: -2 } },
];

const BY_ID = new Map(TECHS.map((t) => [t.id, t]));

export function techById(id: string): Tech | undefined {
  return BY_ID.get(id);
}

export type TechStatus = 'unlocked' | 'available' | 'unaffordable' | 'locked';

export function techStatus(tech: Tech, state: GameState): TechStatus {
  if (state.techs.includes(tech.id)) return 'unlocked';
  const prereqsMet = tech.prereqs.every((p) => state.techs.includes(p));
  const capMet =
    tech.requiresCapability === undefined ||
    state.resources.capability >= tech.requiresCapability;
  if (!prereqsMet || !capMet) return 'locked';
  if (state.resources.research < tech.cost) return 'unaffordable';
  return 'available';
}

export function unlockedTechs(state: GameState): Tech[] {
  return state.techs.map((id) => BY_ID.get(id)).filter((t): t is Tech => !!t);
}
