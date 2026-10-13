import type { Anamnesis, Database, DietPlan, EnergyPlan, Patient } from '../types';

export function emptyAnamnesis(): Anamnesis {
  return {
    pathologies: '',
    medications: '',
    familyHistory: '',
    allergies: '',
    aversions: '',
    preferences: '',
    routine: '',
    physicalActivity: '',
    sleep: '',
    bowel: '',
    waterIntake: '',
    alcoholSmoking: '',
    recall24h: '',
  };
}

export function defaultEnergyPlan(): EnergyPlan {
  return {
    formula: 'mifflin',
    activityFactor: 1.55,
    driLevel: 'ativo',
    includeTef: false,
    adjustmentKcal: 0,
    carbs: { mode: 'percent', value: 50 },
    protein: { mode: 'gkg', value: 1.6 },
    fat: { mode: 'percent', value: 25 },
    overrides: {},
  };
}

export function defaultDiet(): DietPlan {
  const meal = (name: string, time: string) => ({ id: crypto.randomUUID(), name, time, items: [], notes: '' });
  return {
    meals: [
      meal('Café da manhã', '07:00'),
      meal('Lanche da manhã', '10:00'),
      meal('Almoço', '12:30'),
      meal('Lanche da tarde', '16:00'),
      meal('Jantar', '19:30'),
    ],
    guidelines: '',
  };
}

export function newPatient(partial: Partial<Patient> = {}): Patient {
  return {
    id: crypto.randomUUID(),
    name: '',
    birthDate: '1990-01-01',
    sex: 'F',
    phone: '',
    email: '',
    goal: '',
    status: 'ativo',
    notes: '',
    createdAt: new Date().toISOString(),
    anamnesis: emptyAnamnesis(),
    assessments: [],
    energy: defaultEnergyPlan(),
    diet: defaultDiet(),
    supplements: [],
    ...partial,
  };
}

function isoDaysAgo(days: number, time = '09:00'): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.toISOString().slice(0, 10)}T${time}`;
}

/** Banco inicial com uma paciente de exemplo para explorar o sistema. */
export function seedDatabase(): Database {
  const item = (foodId: string, amount: number, measure = '') => ({ id: crypto.randomUUID(), foodId, amount, measure });
  const ana = newPatient({
    name: 'Ana Souza (exemplo)',
    birthDate: '1992-05-14',
    sex: 'F',
    phone: '(11) 98888-0000',
    email: 'ana@exemplo.com',
    goal: 'Emagrecimento com preservação de massa magra',
    anamnesis: {
      ...emptyAnamnesis(),
      pathologies: 'Sem patologias diagnosticadas',
      allergies: 'Nenhuma',
      aversions: 'Fígado, jiló',
      routine: 'Trabalho administrativo 08h–17h. Musculação 4×/semana às 18h.',
      physicalActivity: 'Musculação 4×/semana, 60 min',
      sleep: '6–7 h por noite',
      bowel: 'Diário, Bristol tipo 4',
      waterIntake: '~1,5 L/dia',
    },
    assessments: [
      {
        id: crypto.randomUUID(),
        date: isoDaysAgo(60).slice(0, 10),
        weight: 72.4,
        height: 165,
        method: 'pollock3',
        skinfolds: { triceps: 24, suprailiac: 22, thigh: 32 },
        circumferences: { waist: 80, hip: 104 },
        notes: 'Avaliação inicial',
      },
      {
        id: crypto.randomUUID(),
        date: isoDaysAgo(30).slice(0, 10),
        weight: 70.8,
        height: 165,
        method: 'pollock3',
        skinfolds: { triceps: 22, suprailiac: 19, thigh: 30 },
        circumferences: { waist: 77, hip: 102 },
        notes: '',
      },
      {
        id: crypto.randomUUID(),
        date: isoDaysAgo(2).slice(0, 10),
        weight: 69.5,
        height: 165,
        method: 'pollock3',
        skinfolds: { triceps: 20, suprailiac: 17, thigh: 28 },
        circumferences: { waist: 75, hip: 101 },
        notes: '',
      },
    ],
    energy: { ...defaultEnergyPlan(), adjustmentKcal: -400 },
    diet: {
      guidelines: 'Beber 2,5 L de água por dia. Preferir preparações grelhadas, assadas ou cozidas.',
      meals: [
        {
          id: crypto.randomUUID(),
          name: 'Café da manhã',
          time: '07:00',
          notes: '',
          items: [item('pao-integral', 2, 'fatia'), item('ovo-inteiro', 2, 'unidade'), item('mamao-papaia', 1, 'fatia média'), item('cafe', 1, 'xícara de café')],
        },
        {
          id: crypto.randomUUID(),
          name: 'Almoço',
          time: '12:30',
          notes: '',
          items: [
            item('arroz-integral', 4, 'colher de sopa'),
            item('feijao-carioca', 1, 'concha média'),
            item('frango-peito-grelhado', 120),
            item('alface-crespa', 1, 'prato de sobremesa'),
            item('tomate', 4, 'fatia'),
            item('azeite', 1, 'colher de chá'),
          ],
        },
        {
          id: crypto.randomUUID(),
          name: 'Lanche da tarde (pré-treino)',
          time: '16:30',
          notes: '',
          items: [item('banana-prata', 1, 'unidade média'), item('aveia', 2, 'colher de sopa'), item('iogurte-desnatado', 1, 'pote')],
        },
        {
          id: crypto.randomUUID(),
          name: 'Pós-treino',
          time: '19:15',
          notes: '',
          items: [item('whey-concentrado', 1, 'scoop')],
        },
        {
          id: crypto.randomUUID(),
          name: 'Jantar',
          time: '20:00',
          notes: '',
          items: [item('batata-doce', 150), item('patinho-grelhado', 100), item('brocolis', 4, 'ramo'), item('azeite', 1, 'colher de chá')],
        },
      ],
    },
    supplements: [
      {
        id: crypto.randomUUID(),
        name: 'Creatina monoidratada',
        dose: '3 g',
        form: 'Pó',
        timing: 'Diariamente, junto ao pós-treino',
        justification: 'Melhora de desempenho em treino resistido e preservação de massa magra.',
      },
    ],
  });

  const fold7 = (base: number) => ({
    chest: 12 + base,
    midaxillary: 14 + base,
    triceps: 11 + base,
    subscapular: 16 + base,
    abdominal: 24 + base,
    suprailiac: 18 + base,
    thigh: 15 + base,
  });
  const carlos = newPatient({
    name: 'Carlos Lima (exemplo)',
    birthDate: '1988-09-02',
    sex: 'M',
    phone: '(21) 97777-0000',
    goal: 'Hipertrofia com ganho de massa magra',
    targetFatPercent: 13,
    anamnesis: { ...emptyAnamnesis(), physicalActivity: 'Musculação 5×/semana e corrida 2×/semana', sleep: '7 h por noite' },
    assessments: [
      { id: crypto.randomUUID(), date: isoDaysAgo(90).slice(0, 10), weight: 78.2, height: 178, method: 'pollock7', densityEquation: 'siri', skinfolds: fold7(4), circumferences: { waist: 88, hip: 99, arm: 33, abdomen: 90 }, notes: 'Avaliação inicial' },
      { id: crypto.randomUUID(), date: isoDaysAgo(45).slice(0, 10), weight: 79.1, height: 178, method: 'pollock7', densityEquation: 'siri', skinfolds: fold7(2), circumferences: { waist: 86, hip: 99, arm: 34, abdomen: 88 }, notes: '' },
      { id: crypto.randomUUID(), date: isoDaysAgo(5).slice(0, 10), weight: 80.0, height: 178, method: 'pollock7', densityEquation: 'siri', skinfolds: fold7(0), circumferences: { waist: 84, hip: 100, arm: 35.5, abdomen: 86 }, notes: '' },
    ],
    energy: { ...defaultEnergyPlan(), formula: 'cunningham', activityFactor: 1.725, adjustmentKcal: 300, protein: { mode: 'gkg', value: 2 }, fat: { mode: 'gkg', value: 1 }, carbs: { mode: 'remainder', value: 0 } },
  });

  return {
    version: 1,
    patients: [ana, carlos],
    consultations: [
      { id: crypto.randomUUID(), patientId: ana.id, date: isoDaysAgo(60, '10:00'), type: 'primeira', price: 250, paymentStatus: 'pago', paymentMethod: 'Pix', notes: '' },
      { id: crypto.randomUUID(), patientId: ana.id, date: isoDaysAgo(30, '10:00'), type: 'retorno', price: 180, paymentStatus: 'pago', paymentMethod: 'Cartão', notes: '' },
      { id: crypto.randomUUID(), patientId: ana.id, date: isoDaysAgo(2, '10:00'), type: 'retorno', price: 180, paymentStatus: 'pendente', paymentMethod: 'Pix', notes: '' },
      { id: crypto.randomUUID(), patientId: ana.id, date: isoDaysAgo(-28, '10:00'), type: 'retorno', price: 180, paymentStatus: 'pendente', paymentMethod: '', notes: 'Próximo retorno' },
    ],
    customFoods: [],
  };
}
