import type { Food, FoodGroup, HouseholdMeasure, MarketSector } from '../types';

// Composição por 100 g, Tabela TACO (NEPA/UNICAMP, 4ª ed.), exceto onde a
// fonte indica "Rótulo" (valores médios de rótulos comerciais).
// Colunas: id, nome, grupo, setor, kcal, carboidrato, proteína, lipídio, fibra, medidas

type Row = [string, string, FoodGroup, MarketSector, number, number, number, number, number, HouseholdMeasure[], Food['source']?];

const m = (label: string, grams: number): HouseholdMeasure => ({ label, grams });

const rows: Row[] = [
  // Cereais, pães e tubérculos
  ['arroz-branco', 'Arroz, tipo 1, cozido', 'cereais', 'mercearia', 128, 28.1, 2.5, 0.2, 1.6, [m('colher de sopa', 25), m('escumadeira', 45), m('colher de servir', 45)]],
  ['arroz-integral', 'Arroz, integral, cozido', 'cereais', 'mercearia', 124, 25.8, 2.6, 1.0, 2.7, [m('colher de sopa', 25), m('escumadeira', 45), m('colher de servir', 45)]],
  ['batata-doce', 'Batata-doce, cozida', 'cereais', 'hortifruti', 77, 18.4, 0.6, 0.1, 2.2, [m('unidade média', 150), m('fatia', 40), m('colher de sopa', 30)]],
  ['batata-inglesa', 'Batata, inglesa, cozida', 'cereais', 'hortifruti', 52, 11.9, 1.2, 0.0, 1.3, [m('unidade média', 130), m('colher de sopa', 30)]],
  ['mandioca', 'Mandioca, cozida', 'cereais', 'hortifruti', 125, 30.1, 0.6, 0.3, 1.6, [m('pedaço médio', 70), m('colher de sopa', 30)]],
  ['cuscuz-milho', 'Cuscuz, de milho, cozido com sal', 'cereais', 'mercearia', 113, 25.3, 2.2, 0.7, 2.1, [m('fatia', 60), m('colher de sopa', 30)]],
  ['aveia', 'Aveia, flocos, crua', 'cereais', 'mercearia', 394, 66.6, 13.9, 8.5, 9.1, [m('colher de sopa', 15), m('colher de sobremesa', 8)]],
  ['pao-frances', 'Pão, trigo, francês', 'cereais', 'padaria', 300, 58.6, 8.0, 3.1, 2.3, [m('unidade', 50)]],
  ['pao-integral', 'Pão, trigo, forma, integral', 'cereais', 'padaria', 253, 49.9, 9.4, 3.7, 6.9, [m('fatia', 25)]],
  ['macarrao-cru', 'Macarrão, trigo, cru', 'cereais', 'mercearia', 371, 77.9, 10.0, 1.3, 2.9, [m('xícara', 80)]],
  ['farinha-mandioca', 'Farinha, de mandioca, torrada', 'cereais', 'mercearia', 365, 89.2, 1.2, 0.3, 6.5, [m('colher de sopa', 16)]],
  ['polvilho-doce', 'Polvilho, doce (goma de tapioca seca)', 'cereais', 'mercearia', 351, 86.8, 0.4, 0.0, 0.2, [m('colher de sopa', 15)]],
  ['milho-verde', 'Milho, verde, enlatado, drenado', 'cereais', 'mercearia', 98, 17.1, 3.2, 2.4, 4.6, [m('colher de sopa', 24)]],
  ['biscoito-cream-cracker', 'Biscoito, salgado, cream cracker', 'cereais', 'mercearia', 432, 68.7, 10.1, 14.4, 2.5, [m('unidade', 6)]],
  ['pao-de-queijo', 'Pão, de queijo, assado', 'cereais', 'padaria', 363, 34.2, 5.1, 24.6, 0.6, [m('unidade média', 20)]],

  // Leguminosas
  ['feijao-carioca', 'Feijão, carioca, cozido', 'leguminosas', 'mercearia', 76, 13.6, 4.8, 0.5, 8.5, [m('concha média', 86), m('colher de sopa', 17)]],
  ['feijao-preto', 'Feijão, preto, cozido', 'leguminosas', 'mercearia', 77, 14.0, 4.5, 0.5, 8.4, [m('concha média', 86), m('colher de sopa', 17)]],
  ['lentilha', 'Lentilha, cozida', 'leguminosas', 'mercearia', 93, 16.3, 6.3, 0.5, 7.9, [m('concha média', 86), m('colher de sopa', 18)]],
  ['grao-de-bico', 'Grão-de-bico, cru', 'leguminosas', 'mercearia', 355, 57.9, 21.2, 5.4, 12.4, [m('colher de sopa', 22)]],

  // Carnes, ovos e peixes
  ['frango-peito-grelhado', 'Frango, peito, sem pele, grelhado', 'proteinas', 'acougue', 159, 0, 32.0, 2.5, 0, [m('filé médio', 100), m('colher de sopa (desfiado)', 25)]],
  ['frango-peito-cozido', 'Frango, peito, sem pele, cozido', 'proteinas', 'acougue', 163, 0, 31.5, 3.2, 0, [m('filé médio', 100), m('colher de sopa (desfiado)', 25)]],
  ['patinho-grelhado', 'Carne, bovina, patinho, sem gordura, grelhado', 'proteinas', 'acougue', 219, 0, 35.9, 7.3, 0, [m('bife médio', 100), m('colher de sopa (moído)', 25)]],
  ['acem-moido', 'Carne, bovina, acém, moído, cozido', 'proteinas', 'acougue', 212, 0, 26.7, 10.9, 0, [m('colher de sopa', 25)]],
  ['contrafile-grelhado', 'Carne, bovina, contra-filé, sem gordura, grelhado', 'proteinas', 'acougue', 194, 0, 35.9, 4.5, 0, [m('bife médio', 100)]],
  ['lombo-suino', 'Porco, lombo, assado', 'proteinas', 'acougue', 210, 0, 35.7, 6.4, 0, [m('fatia média', 80)]],
  ['ovo-inteiro', 'Ovo, de galinha, inteiro, cozido 10 min', 'proteinas', 'acougue', 146, 0.6, 13.3, 9.5, 0, [m('unidade', 50)]],
  ['ovo-clara', 'Ovo, de galinha, clara, cozida', 'proteinas', 'acougue', 59, 0, 13.4, 0.1, 0, [m('unidade', 30)]],
  ['merluza-assada', 'Merluza, filé, assado', 'proteinas', 'acougue', 122, 0, 26.6, 0.9, 0, [m('filé médio', 100)]],
  ['salmao-grelhado', 'Salmão, filé, com pele, fresco, grelhado', 'proteinas', 'acougue', 229, 0, 23.9, 14.0, 0, [m('filé médio', 100)]],
  ['atum-oleo', 'Atum, conserva em óleo', 'proteinas', 'mercearia', 166, 0, 26.2, 6.0, 0, [m('lata drenada', 120), m('colher de sopa', 20)]],
  ['sardinha-oleo', 'Sardinha, conserva em óleo', 'proteinas', 'mercearia', 285, 0, 15.9, 24.0, 0, [m('unidade', 25)]],

  // Laticínios
  ['leite-integral', 'Leite, de vaca, integral', 'laticinios', 'laticinios', 61, 4.3, 2.9, 3.2, 0, [m('copo americano', 190), m('xícara', 240)]],
  ['leite-desnatado', 'Leite, de vaca, desnatado, UHT', 'laticinios', 'laticinios', 35, 4.9, 3.4, 0.2, 0, [m('copo americano', 190), m('xícara', 240)]],
  ['leite-po-desnatado', 'Leite, em pó, desnatado', 'laticinios', 'laticinios', 362, 53.0, 34.7, 0.9, 0, [m('colher de sopa', 15)]],
  ['iogurte-natural', 'Iogurte, natural', 'laticinios', 'laticinios', 51, 1.9, 4.1, 3.0, 0, [m('pote', 170)]],
  ['iogurte-desnatado', 'Iogurte, natural, desnatado', 'laticinios', 'laticinios', 41, 5.8, 3.8, 0.3, 0, [m('pote', 170)]],
  ['queijo-minas', 'Queijo, minas, frescal', 'laticinios', 'laticinios', 264, 3.2, 17.4, 20.2, 0, [m('fatia', 30)]],
  ['queijo-mussarela', 'Queijo, mozarela', 'laticinios', 'laticinios', 330, 3.0, 22.6, 25.2, 0, [m('fatia', 15)]],
  ['ricota', 'Queijo, ricota', 'laticinios', 'laticinios', 140, 3.8, 12.6, 8.1, 0, [m('fatia', 30), m('colher de sopa', 25)]],
  ['requeijao', 'Queijo, requeijão, cremoso', 'laticinios', 'laticinios', 257, 2.4, 9.6, 23.4, 0, [m('colher de sopa', 30), m('ponta de faca', 10)]],

  // Frutas
  ['banana-prata', 'Banana, prata, crua', 'frutas', 'hortifruti', 98, 26.0, 1.3, 0.1, 2.0, [m('unidade média', 55)]],
  ['banana-nanica', 'Banana, nanica, crua', 'frutas', 'hortifruti', 92, 23.8, 1.4, 0.1, 1.9, [m('unidade média', 90)]],
  ['maca-fuji', 'Maçã, Fuji, com casca, crua', 'frutas', 'hortifruti', 56, 15.2, 0.3, 0.0, 1.3, [m('unidade média', 130)]],
  ['mamao-papaia', 'Mamão, Papaia, cru', 'frutas', 'hortifruti', 40, 10.4, 0.5, 0.1, 1.0, [m('fatia média', 100), m('meia unidade', 150)]],
  ['laranja-pera', 'Laranja, pêra, crua', 'frutas', 'hortifruti', 37, 8.9, 1.0, 0.1, 0.8, [m('unidade média', 140)]],
  ['morango', 'Morango, cru', 'frutas', 'hortifruti', 30, 6.8, 0.9, 0.3, 1.7, [m('unidade', 12), m('xícara', 140)]],
  ['abacate', 'Abacate, cru', 'frutas', 'hortifruti', 96, 6.0, 1.2, 8.4, 6.3, [m('colher de sopa', 30)]],
  ['manga-palmer', 'Manga, Palmer, crua', 'frutas', 'hortifruti', 72, 19.4, 0.4, 0.2, 1.6, [m('fatia média', 80)]],
  ['melancia', 'Melancia, crua', 'frutas', 'hortifruti', 33, 8.1, 0.9, 0.0, 0.1, [m('fatia média', 200)]],
  ['uva-italia', 'Uva, Itália, crua', 'frutas', 'hortifruti', 53, 13.6, 0.7, 0.2, 0.9, [m('cacho pequeno', 100), m('unidade', 8)]],
  ['abacaxi', 'Abacaxi, cru', 'frutas', 'hortifruti', 48, 12.3, 0.9, 0.1, 1.0, [m('fatia média', 75)]],
  ['kiwi', 'Kiwi, cru', 'frutas', 'hortifruti', 51, 11.5, 1.3, 0.6, 2.7, [m('unidade', 76)]],

  // Vegetais
  ['alface-crespa', 'Alface, crespa, crua', 'vegetais', 'hortifruti', 11, 1.7, 1.3, 0.2, 1.8, [m('folha', 10), m('prato de sobremesa', 30)]],
  ['tomate', 'Tomate, com semente, cru', 'vegetais', 'hortifruti', 15, 3.1, 1.1, 0.2, 1.2, [m('fatia', 15), m('unidade média', 100)]],
  ['brocolis', 'Brócolis, cozido', 'vegetais', 'hortifruti', 25, 4.4, 2.1, 0.5, 3.4, [m('ramo', 20), m('colher de sopa', 15)]],
  ['cenoura', 'Cenoura, crua', 'vegetais', 'hortifruti', 34, 7.7, 1.3, 0.2, 3.2, [m('colher de sopa (ralada)', 12), m('unidade média', 80)]],
  ['abobrinha', 'Abobrinha, italiana, cozida', 'vegetais', 'hortifruti', 15, 3.0, 1.1, 0.2, 1.6, [m('colher de sopa', 25)]],
  ['chuchu', 'Chuchu, cozido', 'vegetais', 'hortifruti', 19, 4.8, 0.4, 0.0, 1.0, [m('colher de sopa', 25)]],
  ['pepino', 'Pepino, cru', 'vegetais', 'hortifruti', 10, 2.0, 0.9, 0.0, 1.1, [m('fatia', 10)]],
  ['beterraba', 'Beterraba, cozida', 'vegetais', 'hortifruti', 32, 7.2, 1.3, 0.1, 1.9, [m('colher de sopa', 25), m('fatia', 15)]],
  ['couve-refogada', 'Couve, manteiga, refogada', 'vegetais', 'hortifruti', 90, 8.7, 1.7, 6.6, 5.7, [m('colher de sopa', 20)]],

  // Gorduras e oleaginosas
  ['azeite', 'Azeite, de oliva, extra virgem', 'gorduras', 'mercearia', 884, 0, 0, 100, 0, [m('colher de sopa', 8), m('colher de chá', 2), m('fio', 3)]],
  ['oleo-soja', 'Óleo, de soja', 'gorduras', 'mercearia', 884, 0, 0, 100, 0, [m('colher de sopa', 8), m('colher de chá', 2)]],
  ['manteiga', 'Manteiga, com sal', 'gorduras', 'laticinios', 726, 0.1, 0.4, 82.4, 0, [m('ponta de faca', 5), m('colher de chá', 4)]],
  ['amendoim', 'Amendoim, torrado, salgado', 'gorduras', 'mercearia', 606, 18.7, 22.5, 54.0, 7.8, [m('colher de sopa', 17)]],
  ['castanha-para', 'Castanha-do-Brasil, crua', 'gorduras', 'mercearia', 643, 15.1, 14.5, 63.5, 7.9, [m('unidade', 4)]],
  ['castanha-caju', 'Castanha-de-caju, torrada, salgada', 'gorduras', 'mercearia', 570, 29.1, 18.5, 46.3, 3.7, [m('unidade', 2.5)]],
  ['linhaca', 'Linhaça, semente', 'gorduras', 'mercearia', 495, 43.3, 14.1, 32.3, 33.5, [m('colher de sopa', 10)]],

  // Açúcares e bebidas
  ['mel', 'Mel, de abelha', 'acucares', 'mercearia', 309, 84.0, 0, 0, 0, [m('colher de sopa', 20), m('colher de chá', 7)]],
  ['acucar', 'Açúcar, refinado', 'acucares', 'mercearia', 387, 99.5, 0.3, 0, 0, [m('colher de chá', 4), m('colher de sopa', 12)]],
  ['cafe', 'Café, infusão 10%', 'bebidas', 'mercearia', 9, 1.5, 0.7, 0.5, 0, [m('xícara de café', 50), m('xícara', 240)]],

  // Suplementos (rótulo médio)
  ['whey-concentrado', 'Whey protein concentrado', 'suplementos', 'outros', 400, 8.0, 80.0, 6.0, 0, [m('scoop', 30)], 'Rótulo'],
];

export const TACO_FOODS: Food[] = rows.map(
  ([id, name, group, sector, kcal, carbs, protein, fat, fiber, measures, source]) => ({
    id,
    name,
    group,
    sector,
    source: source ?? 'TACO',
    kcal,
    carbs,
    protein,
    fat,
    fiber,
    measures,
  }),
);

export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  cereais: 'Cereais, pães e tubérculos',
  leguminosas: 'Leguminosas',
  proteinas: 'Carnes, ovos e peixes',
  laticinios: 'Leite e derivados',
  frutas: 'Frutas',
  vegetais: 'Verduras e legumes',
  gorduras: 'Óleos, gorduras e oleaginosas',
  acucares: 'Açúcares',
  bebidas: 'Bebidas',
  suplementos: 'Suplementos',
};

export const SECTOR_LABELS: Record<MarketSector, string> = {
  hortifruti: 'Hortifrúti',
  acougue: 'Açougue e peixaria',
  laticinios: 'Frios e laticínios',
  mercearia: 'Mercearia',
  padaria: 'Padaria',
  outros: 'Outros',
};
