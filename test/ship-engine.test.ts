import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateBuild, massUsage, rulesForScale, type PartInfo } from '../src/three/ship/engine/budget';
import { parseShipText } from '../src/three/ship/engine/text';
import { applyPalette, paletteFromHints } from '../src/three/ship/engine/paint';
import { describeBlueprint, picksOf } from '../src/three/ship/engine/spec';
import type { ShipMaterials } from '../src/three/ship/style';

const catalog: PartInfo[] = [
  { id: 'griffon', slot: 'bow', size: 2, weight: 1.4 },
  { id: 'ram', slot: 'bow', size: 3, weight: 2.6 },
  { id: 'domeTiers', slot: 'stern', size: 2, weight: 1.1 },
  { id: 'nozzles', slot: 'engine', size: 1, weight: 0.6 },
  { id: 'bridgeTower', slot: 'deck', size: 1, weight: 0.5 },
];

test('лимиты растут вместе с корпусом', () => {
  assert.equal(rulesForScale(0.72).maxSize, 1);
  assert.equal(rulesForScale(0.95).maxSize, 2);
  assert.equal(rulesForScale(1.28).maxSize, 3);
  assert.equal(rulesForScale(1.0).capacity.engine, 2);
  assert.ok(rulesForScale(1.28).maxMass > rulesForScale(0.72).maxMass);
});

test('полная сборка проходит и считает массу', () => {
  const rules = rulesForScale(1.0);
  const budget = evaluateBuild(
    [
      { slot: 'bow', id: 'griffon' },
      { slot: 'stern', id: 'domeTiers' },
      { slot: 'engine', id: 'nozzles' },
      { slot: 'deck', id: 'bridgeTower' },
    ],
    catalog,
    rules,
  );
  assert.equal(budget.ok, true);
  assert.equal(budget.mass, 3.6);
  assert.deepEqual(budget.errors, []);
  assert.equal(massUsage(budget, rules), 0.51);
});

test('неизвестная часть и чужой слот — ошибки, а не молчание', () => {
  const rules = rulesForScale(1.0);
  const unknown = evaluateBuild([{ slot: 'bow', id: 'phantom' }], catalog, rules);
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /не найдена/);

  const wrongSlot = evaluateBuild([{ slot: 'stern', id: 'griffon' }], catalog, rules);
  assert.equal(wrongSlot.ok, false);
  assert.match(wrongSlot.errors[0], /слот bow/);
});

test('перебор по количеству и по типоразмеру ловится', () => {
  const rules = rulesForScale(0.72);
  const tooBig = evaluateBuild([{ slot: 'bow', id: 'ram' }], catalog, rules);
  assert.equal(tooBig.ok, false);
  assert.ok(tooBig.errors.some((error) => /не влезает/.test(error)));

  const tooMany = evaluateBuild(
    [
      { slot: 'engine', id: 'nozzles' },
      { slot: 'engine', id: 'nozzles' },
      { slot: 'engine', id: 'nozzles' },
    ],
    catalog,
    rules,
  );
  assert.equal(tooMany.ok, false);
  assert.ok(tooMany.errors.some((error) => /лимите 2/.test(error)));
});

test('перегруз по массе останавливает сборку', () => {
  const rules = { capacity: { bow: 1, stern: 1, engine: 2, deck: 3 }, maxMass: 1, maxSize: 3 as const };
  const budget = evaluateBuild([{ slot: 'bow', id: 'ram' }], catalog, rules);
  assert.equal(budget.ok, false);
  assert.ok(budget.errors.some((error) => /масса/.test(error)));
});

test('описание словами даёт фракцию, класс и оснастку', () => {
  const { build, notes } = parseShipText('Имперский дредноут без парусов, две башни, сид 12, алый');
  assert.equal(build.faction, 'empire');
  assert.equal(build.classId, 'dreadnought');
  assert.equal(build.sails, 'none');
  assert.equal(build.gunRows, 2);
  assert.equal(build.seed, 12);
  assert.deepEqual(build.paletteHints, ['red']);
  assert.ok(notes.length >= 4);
});

test('описание без ключевых слов не выдумывает параметры', () => {
  const { build, notes } = parseShipText('просто корабль');
  assert.equal(build.faction, undefined);
  assert.equal(build.classId, undefined);
  assert.equal(build.sails, undefined);
  assert.equal(notes.length, 1);

  const empty = parseShipText('   ');
  assert.deepEqual(empty.build.traits, []);
  assert.match(empty.notes[0], /пустое/);
});

test('паруса и число мачт читаются по-разному', () => {
  const square = parseShipText('оркский фрегат, прямые паруса, три мачты');
  assert.equal(square.build.faction, 'ork');
  assert.equal(square.build.sails, 'squareRig');
  assert.equal(square.build.masts, 3);
});

function fakeMaterials(): ShipMaterials {
  const make = (hex: number) => ({
    color: {
      hex,
      getHex() {
        return this.hex;
      },
      setHex(value: number) {
        this.hex = value;
      },
    },
  });
  return {
    hull: make(0x101010),
    deck: make(0x202020),
    wood: make(0x303030),
    trim: make(0x404040),
    sail: make(0x505050),
    glass: make(0x606060),
    core: make(0x707070),
    dark: make(0x808080),
    lamp: make(0x909090),
  } as unknown as ShipMaterials;
}

test('палитра красит только заданные каналы', () => {
  const mats = fakeMaterials();
  const applied = applyPalette(mats, { hull: 0x6d1b24 });
  assert.deepEqual(applied, { hull: 0x6d1b24 });
  assert.equal(mats.hull.color.getHex(), 0x6d1b24);
  assert.equal(mats.trim.color.getHex(), 0x404040);
});

test('слово-краска правит палитру, не теряя базу', () => {
  const palette = paletteFromHints(['red'], { deck: 0x222222 });
  assert.equal(palette.hull, 0x6d1b24);
  assert.equal(palette.deck, 0x222222);
  assert.equal(paletteFromHints([], { deck: 1 }).hull, undefined);
});

test('блюпринт описывается и разворачивается в выборы', () => {
  const blueprint = {
    faction: 'empire',
    classId: 'dreadnought',
    seed: 12,
    bow: 'beak',
    deck: ['bridgeTower' as const, 'spineRibs' as const],
    sails: 'none' as const,
  };
  const picks = picksOf(blueprint);
  assert.equal(picks.length, 3);
  assert.deepEqual(picks[1], { slot: 'deck', id: 'bridgeTower' });
  const text = describeBlueprint(blueprint);
  assert.match(text, /empire/);
  assert.match(text, /seed 12/);
  assert.match(text, /паруса none/);
});
