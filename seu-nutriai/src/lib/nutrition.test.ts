import { describe, expect, it } from 'vitest';
import { TACO_FOODS } from '../data/taco';
import { defaultEnergyPlan } from '../data/seed';
import { ageAt, bmi, bmiClass, brozek, densityDurnin, densityPollock3, densityPollock7, evaluateAssessment, fatClass, faulknerPercent, siri, waistRisk } from './anthropometry';
import { seedDatabase } from '../data/seed';
import { bmr, computeEnergy, macroTargets } from './energy';
import { itemGrams, nutrientsFor } from './diet';
import { equivalentGrams, findEquivalents } from './substitutions';
import { parseDietText } from './dietParser';

const food = (id: string) => TACO_FOODS.find((f) => f.id === id)!;

describe('antropometria', () => {
  it('IMC e classificação OMS', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 2);
    expect(bmiClass(22.86)).toBe('Eutrofia');
    expect(bmiClass(31)).toBe('Obesidade grau I');
  });

  it('idade considera o aniversário', () => {
    expect(ageAt('1990-06-15', '2020-06-14')).toBe(29);
    expect(ageAt('1990-06-15', '2020-06-15')).toBe(30);
  });

  it('Pollock 3 dobras masculino + Siri', () => {
    // Σ = 60 mm, 30 anos: D = 1.10938 − 0.049602 + 0.00576 − 0.007722 = 1.057816
    const d = densityPollock3('M', 30, { chest: 15, abdominal: 25, thigh: 20 })!;
    expect(d).toBeCloseTo(1.057816, 5);
    expect(siri(d)).toBeCloseTo(17.95, 1);
  });

  it('Pollock 3 dobras exige todas as dobras do sexo', () => {
    expect(densityPollock3('F', 30, { triceps: 20, thigh: 25 })).toBeUndefined();
  });

  it('Pollock 7 dobras feminino', () => {
    const folds = { chest: 10, midaxillary: 10, triceps: 20, subscapular: 15, abdominal: 25, suprailiac: 15, thigh: 25 };
    // Σ = 120, 25 anos
    const expected = 1.097 - 0.00046971 * 120 + 0.00000056 * 120 * 120 - 0.00012828 * 25;
    expect(densityPollock7('F', 25, folds)).toBeCloseTo(expected, 8);
  });
});

describe('protocolos adicionais', () => {
  it('Durnin & Womersley usa coeficientes da faixa etária', () => {
    const folds = { biceps: 5, triceps: 10, subscapular: 15, suprailiac: 10 }; // Σ = 40
    expect(densityDurnin('M', 25, folds)).toBeCloseTo(1.1631 - 0.0632 * Math.log10(40), 8);
    expect(densityDurnin('F', 45, folds)).toBeCloseTo(1.1333 - 0.0612 * Math.log10(40), 8);
  });

  it('Faulkner e Brozek', () => {
    expect(faulknerPercent({ triceps: 10, subscapular: 12, suprailiac: 14, abdominal: 20 })).toBeCloseTo(0.153 * 56 + 5.783, 6);
    expect(brozek(1.05)).toBeCloseTo((4.57 / 1.05 - 4.142) * 100, 6);
  });

  it('classificações', () => {
    expect(fatClass(15, 'M')).toBe('Média');
    expect(fatClass(33, 'F')).toBe('Risco (obesidade)');
    expect(waistRisk(85, 'F')).toBe('elevado');
    expect(waistRisk(90, 'M')).toBe('normal');
    expect(bmiClass(26, 65)).toBe('Eutrofia (idoso)');
  });

  it('CMB, RCEst e peso-meta', () => {
    const r = evaluateAssessment(
      { id: 'a', date: '2024-01-01', weight: 80, height: 180, method: 'bioimpedancia', bioFatPercent: 25, skinfolds: { triceps: 10 }, circumferences: { arm: 32, waist: 90 }, notes: '' },
      'M',
      '1990-01-01',
      15,
    );
    expect(r.armMuscleCircumference).toBeCloseTo(32 - Math.PI, 6);
    expect(r.waistHeightRatio).toBeCloseTo(0.5, 6);
    expect(r.targetWeight).toBeCloseTo(60 / 0.85, 6);
  });
});

describe('gasto energético', () => {
  const p = { sex: 'M' as const, age: 30, weight: 80, height: 180, leanMass: 65 };

  it('fórmulas de TMB', () => {
    expect(bmr('mifflin', p)).toBeCloseTo(1780, 0);
    expect(bmr('harris-benedict', p)).toBeCloseTo(1864.5, 0);
    expect(bmr('cunningham', p)).toBeCloseTo(1930, 0);
    expect(bmr('katch-mcardle', p)).toBeCloseTo(1774, 0);
    // DRI ativo: 662 − 285.9 + 1.25 × (1272.8 + 971.28)
    expect(bmr('dri-iom', p, 'ativo')).toBeCloseTo(3181.2, 0);
    expect(bmr('fao-oms', p)).toBeCloseTo(11.6 * 80 + 879, 6);
    expect(bmr('tinsley-peso', p)).toBeCloseTo(24.8 * 80 + 10, 6);
    expect(bmr('tinsley-mlg', p)).toBeCloseTo(25.9 * 65 + 284, 6);
    expect(bmr('ten-haaf', p)).toBeCloseTo(11.936 * 80 + 587.728 * 1.8 - 8.129 * 30 + 191.027 + 29.279, 6);
    expect(bmr('kcal-kg', { ...p, kcalPerKg: 30 })).toBe(2400);
  });

  it('GET aplica FA e ETA, exceto na DRI', () => {
    const plan = { ...defaultEnergyPlan(), formula: 'mifflin' as const, activityFactor: 1.5, includeTef: true, adjustmentKcal: -500 };
    const r = computeEnergy(plan, p);
    expect(r.get).toBeCloseTo(1780 * 1.5 * 1.1, 3);
    expect(r.vet).toBeCloseTo(1780 * 1.5 * 1.1 - 500, 3);
    const dri = computeEnergy({ ...plan, formula: 'dri-iom', includeTef: false, adjustmentKcal: 0 }, p);
    expect(dri.get).toBeCloseTo(dri.bmr!, 6);
  });

  it('Cunningham sem massa magra não calcula', () => {
    const r = computeEnergy({ ...defaultEnergyPlan(), formula: 'cunningham' }, { ...p, leanMass: undefined });
    expect(r.vet).toBeUndefined();
    expect(r.missing).toBeTruthy();
  });

  it('metas de macros em g/kg e %VET, com override', () => {
    const plan = defaultEnergyPlan(); // CHO 50%, PTN 1.6 g/kg, LIP 25%
    const t = macroTargets(plan, 2000, 70);
    expect(t.grams.carbs).toBeCloseTo(250);
    expect(t.grams.protein).toBeCloseTo(112);
    expect(t.grams.fat).toBeCloseTo(55.56, 1);
    const r = macroTargets({ ...plan, carbs: { mode: 'remainder', value: 0 } }, 2000, 70);
    expect(r.totalKcal).toBeCloseTo(2000, 6);
    expect(r.grams.carbs).toBeCloseTo((2000 - 112 * 4 - 500) / 4, 6);
    const o = macroTargets({ ...plan, overrides: { protein: 130 } }, 2000, 70);
    expect(o.grams.protein).toBe(130);
  });
});

describe('banco de alimentos', () => {
  it('contém a TACO completa com IDs únicos', () => {
    expect(TACO_FOODS.length).toBeGreaterThan(590);
    expect(new Set(TACO_FOODS.map((f) => f.id)).size).toBe(TACO_FOODS.length);
  });

  it('valores conferem com a TACO', () => {
    expect(food('arroz-integral')).toMatchObject({ kcal: 124, carbs: 25.8, protein: 2.6, fat: 1, fiber: 2.7 });
    expect(food('feijao-carioca').micros!.iron).toBeGreaterThan(1);
  });

  it('todos os alimentos do exemplo existem', () => {
    const ids = new Set(TACO_FOODS.map((f) => f.id));
    for (const p of seedDatabase().patients) for (const m of p.diet.meals) for (const it of m.items) expect(ids.has(it.foodId)).toBe(true);
  });
});

describe('dieta e medidas caseiras', () => {
  it('converte medida caseira em gramas', () => {
    const arroz = food('arroz-branco');
    expect(itemGrams({ id: 'x', foodId: arroz.id, amount: 4, measure: 'colher de sopa' }, arroz)).toBe(100);
    expect(nutrientsFor(arroz, 100).kcal).toBe(128);
  });
});

describe('substituições', () => {
  it('equivalência isoglicídica arroz → batata-doce', () => {
    const g = equivalentGrams(food('arroz-branco'), 100, food('batata-doce'), 'carbs')!;
    expect(g).toBeCloseTo((100 * 28.1) / 18.4, 3);
  });

  it('lista só alimentos do mesmo grupo', () => {
    const eq = findEquivalents(food('arroz-branco'), 100, TACO_FOODS);
    expect(eq.length).toBeGreaterThan(3);
    expect(eq.every((e) => e.food.group === 'cereais')).toBe(true);
    expect(eq.some((e) => e.food.id === 'pao-de-queijo')).toBe(false);
    expect(eq.every((e) => e.food.measures.length > 0)).toBe(true);
    expect(findEquivalents(food('cafe'), 50, TACO_FOODS)).toEqual([]);
  });
});

describe('importador de texto', () => {
  it('reconhece refeições, horários, quantidades e medidas', () => {
    const text = `Café da manhã - 07:00
- 2 fatias de pão integral
- 2 ovos cozidos
- 1 col. sopa de aveia
Almoço (12h30)
• 100g de arroz integral
• 1 concha de feijão carioca
• 120 g peito de frango grelhado
ou 120 g de patinho
Ceia
1/2 xícara de morango`;
    const meals = parseDietText(text, TACO_FOODS);
    expect(meals.map((m) => [m.name, m.time])).toEqual([
      ['Café da manhã', '07:00'],
      ['Almoço', '12:30'],
      ['Ceia', ''],
    ]);
    const [cafe, almoco, ceia] = meals;
    expect(cafe!.items.map((i) => [i.food?.id, i.amount, i.measure])).toEqual([
      ['pao-integral', 2, 'fatia'],
      ['ovo-inteiro', 2, 'unidade'],
      ['aveia', 1, 'colher de sopa'],
    ]);
    expect(almoco!.items.map((i) => [i.food?.id, i.amount, i.measure])).toEqual([
      ['arroz-integral', 100, ''],
      ['feijao-carioca', 1, 'concha média'],
      ['frango-peito-grelhado', 120, ''],
    ]);
    expect(ceia!.items[0]).toMatchObject({ amount: 0.5, measure: 'xícara' });
    expect(ceia!.items[0]!.food?.id).toBe('morango');
  });
});
