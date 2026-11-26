/**
 * Смета сборки: правила, которые можно проверить без графики. Движок не даёт
 * собрать борт из частей, которые не подходят слоту, не влезают по типоразмеру
 * или перебирают массу. Всё здесь — чистые числа, поэтому покрывается тестами.
 */

export type SlotName = 'bow' | 'stern' | 'engine' | 'deck';
export type PartSize = 1 | 2 | 3;

export interface PartInfo {
  id: string;
  slot: SlotName;
  size: PartSize;
  weight: number;
}

/** Один выбор игрока: какую часть в какой слот. */
export interface Pick {
  slot: SlotName;
  id: string;
}

export interface Rules {
  /** Сколько частей принимает слот: нос один, двигателей два, надстроек три. */
  capacity: Record<SlotName, number>;
  maxMass: number;
  maxSize: PartSize;
}

export interface Budget {
  ok: boolean;
  mass: number;
  maxSize: PartSize;
  counts: Record<SlotName, number>;
  errors: string[];
  warnings: string[];
}

export const SLOTS: SlotName[] = ['bow', 'stern', 'engine', 'deck'];

/**
 * Лимиты растут вместе с корпусом: посыльному не дают трёхтяжёлый нос, а
 * дредноуту разрешают всё. Формула нарочно простая и предсказуемая.
 */
export function rulesForScale(scale: number, deckCapacity = 3): Rules {
  const maxSize: PartSize = scale < 0.85 ? 1 : scale < 1.15 ? 2 : 3;
  return {
    capacity: { bow: 1, stern: 1, engine: 2, deck: deckCapacity },
    maxMass: Math.round((3 + scale * 4) * 10) / 10,
    maxSize,
  };
}

export function evaluateBuild(picks: Pick[], catalog: PartInfo[], rules: Rules): Budget {
  const byId = new Map(catalog.map((part) => [part.id, part]));
  const counts: Record<SlotName, number> = { bow: 0, stern: 0, engine: 0, deck: 0 };
  const errors: string[] = [];
  const warnings: string[] = [];
  let mass = 0;
  let maxSize: PartSize = 1;

  for (const pick of picks) {
    const part = byId.get(pick.id);
    if (!part) {
      errors.push(`часть «${pick.id}» не найдена в каталоге`);
      continue;
    }
    if (part.slot !== pick.slot) {
      errors.push(`«${part.id}» ставится в слот ${part.slot}, а не ${pick.slot}`);
      continue;
    }
    counts[pick.slot] += 1;
    mass += part.weight;
    if (part.size > maxSize) maxSize = part.size;
    if (part.size > rules.maxSize) {
      errors.push(`«${part.id}» размера ${part.size} не влезает: корпус до ${rules.maxSize}`);
    }
  }

  for (const slot of SLOTS) {
    if (counts[slot] > rules.capacity[slot]) {
      errors.push(`слот ${slot}: ${counts[slot]} частей при лимите ${rules.capacity[slot]}`);
    }
    if (counts[slot] === 0 && slot !== 'deck') warnings.push(`слот ${slot} пуст`);
  }

  mass = Math.round(mass * 100) / 100;
  if (mass > rules.maxMass) errors.push(`масса ${mass} больше лимита ${rules.maxMass}`);

  return { ok: errors.length === 0, mass, maxSize, counts, errors, warnings };
}

/** Доля израсходованной массы: витрине и редактору нужен процент, не граммы. */
export function massUsage(budget: Budget, rules: Rules): number {
  if (rules.maxMass <= 0) return 0;
  return Math.min(1, Math.round((budget.mass / rules.maxMass) * 100) / 100);
}
