import type { Pick, SlotName } from './budget';

/**
 * Блюпринт — это корабль как данные: фракция, класс, seed и явные выборы по
 * слотам. Генератор умеет собирать и без него (по весам стиля), но всё, что
 * пришло из описания словами или из будущего редактора, приходит блюпринтом.
 */

export type Superstructure = 'cupola' | 'bridgeTower' | 'spineRibs';
export type SailPlanId = 'petalFan' | 'squareRig' | 'none';

export interface ShipBlueprint {
  faction: string;
  classId: string;
  seed: number;
  bow?: string;
  stern?: string;
  engine?: string;
  deck?: Superstructure[];
  sails?: SailPlanId;
  /** Сколько мачт ставить, если описание задаёт число явно. */
  masts?: number;
  gunRows?: 1 | 2;
  palette?: Record<string, number>;
  /** Откуда пришёл блюпринт: рука, текст, каталог. Для подписи в витрине. */
  origin?: 'catalog' | 'text' | 'hand';
}

export interface BlueprintNotes {
  blueprint: ShipBlueprint;
  notes: string[];
}

export const SLOT_OF: Record<string, SlotName> = {
  bow: 'bow',
  stern: 'stern',
  engine: 'engine',
  deck: 'deck',
};

/** Явные выборы блюпринта в виде списка для сметы. */
export function picksOf(blueprint: ShipBlueprint): Pick[] {
  const picks: Pick[] = [];
  if (blueprint.bow) picks.push({ slot: 'bow', id: blueprint.bow });
  if (blueprint.stern) picks.push({ slot: 'stern', id: blueprint.stern });
  if (blueprint.engine) picks.push({ slot: 'engine', id: blueprint.engine });
  for (const deck of blueprint.deck ?? []) picks.push({ slot: 'deck', id: deck });
  return picks;
}

export function describeBlueprint(blueprint: ShipBlueprint): string {
  const parts = [
    blueprint.faction,
    blueprint.classId,
    `seed ${blueprint.seed}`,
    blueprint.bow ? `нос ${blueprint.bow}` : null,
    blueprint.stern ? `корма ${blueprint.stern}` : null,
    blueprint.sails ? `паруса ${blueprint.sails}` : null,
    blueprint.gunRows ? `ярусов ${blueprint.gunRows}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

/**
 * Сливает то, что пришло из текста, с базой каталога. Недостающее остаётся
 * пустым: генератор сам выберет по весам стиля, а не «додумает» чужое.
 */
export function mergeBlueprint(
  base: ShipBlueprint,
  patch: Partial<ShipBlueprint>,
  origin: ShipBlueprint['origin'] = 'text',
): BlueprintNotes {
  const notes: string[] = [];
  const blueprint: ShipBlueprint = { ...base, ...patch, origin };
  for (const slot of ['bow', 'stern', 'engine'] as const) {
    if (patch[slot]) notes.push(`${slot}: ${patch[slot]}`);
  }
  if (patch.deck?.length) notes.push(`надстройки: ${patch.deck.join(', ')}`);
  if (patch.sails) notes.push(`паруса: ${patch.sails}`);
  if (patch.gunRows) notes.push(`ярусы орудий: ${patch.gunRows}`);
  return { blueprint, notes };
}
