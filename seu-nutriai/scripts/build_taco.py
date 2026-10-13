"""Gera src/data/taco.generated.ts a partir da Tabela TACO (4ª ed., NEPA/UNICAMP).

Fonte dos CSVs: https://github.com/raulfdm/taco-api (references/csv).
Uso: python3 scripts/build_taco.py <pasta com food.csv e nutrients.csv>
"""
import csv
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'taco.generated.ts'

# IDs estáveis para alimentos já usados em planos salvos.
SLUGS = {
    'Arroz, tipo 1, cozido': 'arroz-branco',
    'Arroz, integral, cozido': 'arroz-integral',
    'Batata, doce, cozida': 'batata-doce',
    'Batata, inglesa, cozida': 'batata-inglesa',
    'Mandioca, cozida': 'mandioca',
    'Cuscuz, de milho, cozido com sal': 'cuscuz-milho',
    'Aveia, flocos, crua': 'aveia',
    'Pão, trigo, francês': 'pao-frances',
    'Pão, trigo, forma, integral': 'pao-integral',
    'Macarrão, trigo, cru': 'macarrao-cru',
    'Farinha, de mandioca, torrada': 'farinha-mandioca',
    'Polvilho, doce': 'polvilho-doce',
    'Milho, verde, enlatado, drenado': 'milho-verde',
    'Biscoito, salgado, cream cracker': 'biscoito-cream-cracker',
    'Pão, de queijo, assado': 'pao-de-queijo',
    'Feijão, carioca, cozido': 'feijao-carioca',
    'Feijão, preto, cozido': 'feijao-preto',
    'Lentilha, cozida': 'lentilha',
    'Grão-de-bico, cru': 'grao-de-bico',
    'Frango, peito, sem pele, grelhado': 'frango-peito-grelhado',
    'Frango, peito, sem pele, cozido': 'frango-peito-cozido',
    'Carne, bovina, patinho, sem gordura, grelhado': 'patinho-grelhado',
    'Carne, bovina, acém, moído, cozido': 'acem-moido',
    'Carne, bovina, contra-filé, sem gordura, grelhado': 'contrafile-grelhado',
    'Porco, lombo, assado': 'lombo-suino',
    'Ovo, de galinha, inteiro, cozido/10minutos': 'ovo-inteiro',
    'Ovo, de galinha, clara, cozida/10minutos': 'ovo-clara',
    'Merluza, filé, assado': 'merluza-assada',
    'Salmão, filé, com pele, fresco, grelhado': 'salmao-grelhado',
    'Atum, conserva em óleo': 'atum-oleo',
    'Sardinha, conserva em óleo': 'sardinha-oleo',
    'Leite, de vaca, integral': 'leite-integral',
    'Leite, de vaca, desnatado, UHT': 'leite-desnatado',
    'Leite, de vaca, desnatado, pó': 'leite-po-desnatado',
    'Iogurte, natural': 'iogurte-natural',
    'Iogurte, natural, desnatado': 'iogurte-desnatado',
    'Queijo, minas, frescal': 'queijo-minas',
    'Queijo, mozarela': 'queijo-mussarela',
    'Queijo, ricota': 'ricota',
    'Queijo, requeijão, cremoso': 'requeijao',
    'Banana, prata, crua': 'banana-prata',
    'Banana, nanica, crua': 'banana-nanica',
    'Maçã, Fuji, com casca, crua': 'maca-fuji',
    'Mamão, Papaia, cru': 'mamao-papaia',
    'Laranja, pêra, crua': 'laranja-pera',
    'Morango, cru': 'morango',
    'Abacate, cru': 'abacate',
    'Manga, Palmer, crua': 'manga-palmer',
    'Melancia, crua': 'melancia',
    'Uva, Itália, crua': 'uva-italia',
    'Abacaxi, cru': 'abacaxi',
    'Kiwi, cru': 'kiwi',
    'Alface, crespa, crua': 'alface-crespa',
    'Tomate, com semente, cru': 'tomate',
    'Brócolis, cozido': 'brocolis',
    'Cenoura, crua': 'cenoura',
    'Abobrinha, italiana, cozida': 'abobrinha',
    'Chuchu, cozido': 'chuchu',
    'Pepino, cru': 'pepino',
    'Beterraba, cozida': 'beterraba',
    'Couve, manteiga, refogada': 'couve-refogada',
    'Azeite, de oliva, extra virgem': 'azeite',
    'Óleo, de soja': 'oleo-soja',
    'Manteiga, com sal': 'manteiga',
    'Amendoim, torrado, salgado': 'amendoim',
    'Castanha-do-Brasil, crua': 'castanha-para',
    'Castanha-de-caju, torrada, salgada': 'castanha-caju',
    'Linhaça, semente': 'linhaca',
    'Mel, de abelha': 'mel',
    'Açúcar, refinado': 'acucar',
    'Café, infusão 10%': 'cafe',
}

CS, CSOB, CC, ESC, CONCHA, UN, FT, XIC, COPO = (
    'colher de sopa', 'colher de sobremesa', 'colher de chá', 'escumadeira', 'concha média',
    'unidade', 'fatia', 'xícara', 'copo americano')

# Medidas caseiras usuais (g), conforme tabelas brasileiras de medidas caseiras.
MEASURES = {
    'Arroz, tipo 1, cozido': [(CS, 25), (ESC, 45), ('colher de servir', 45)],
    'Arroz, tipo 2, cozido': [(CS, 25), (ESC, 45)],
    'Arroz, integral, cozido': [(CS, 25), (ESC, 45), ('colher de servir', 45)],
    'Batata, doce, cozida': [('unidade média', 150), (FT, 40), (CS, 30)],
    'Batata, inglesa, cozida': [('unidade média', 130), (CS, 30)],
    'Batata, inglesa, sauté': [(CS, 30)],
    'Batata, inglesa, frita': [(CS, 15), ('porção pequena', 100)],
    'Batata, baroa, cozida': [('unidade média', 80), (CS, 30)],
    'Mandioca, cozida': [('pedaço médio', 70), (CS, 30)],
    'Mandioca, frita': [('pedaço médio', 40)],
    'Inhame, cru': [('unidade média', 100)],
    'Cará, cozido': [('pedaço médio', 70)],
    'Cuscuz, de milho, cozido com sal': [(FT, 60), (CS, 30)],
    'Aveia, flocos, crua': [(CS, 15), (CSOB, 8)],
    'Pão, trigo, francês': [(UN, 50)],
    'Pão, trigo, forma, integral': [(FT, 25)],
    'Pão, aveia, forma': [(FT, 25)],
    'Pão, glúten, forma': [(FT, 25)],
    'Pão, milho, forma': [(FT, 25)],
    'Pão, de queijo, assado': [('unidade média', 20), ('unidade grande', 40)],
    'Torrada, pão francês': [(UN, 10)],
    'Macarrão, trigo, cru': [(XIC, 80)],
    'Farinha, de mandioca, torrada': [(CS, 16)],
    'Farinha, de trigo': [(CS, 15), (XIC, 120)],
    'Farinha, de milho, amarela': [(CS, 12)],
    'Milho, fubá, cru': [(CS, 15)],
    'Polvilho, doce': [(CS, 15)],
    'Tapioca, com manteiga': [(UN, 70)],
    'Milho, verde, enlatado, drenado': [(CS, 24)],
    'Milho, verde, cru': [('espiga média', 100)],
    'Biscoito, salgado, cream cracker': [(UN, 6)],
    'Biscoito, doce, maisena': [(UN, 5)],
    'Biscoito, doce, recheado com chocolate': [(UN, 15)],
    'Bolo, pronto, chocolate': [(FT, 60)],
    'Bolo, pronto, milho': [(FT, 60)],
    'Feijão, carioca, cozido': [(CONCHA, 86), (CS, 17)],
    'Feijão, preto, cozido': [(CONCHA, 86), (CS, 17)],
    'Feijão, rajado, cozido': [(CONCHA, 86), (CS, 17)],
    'Feijão, fradinho, cozido': [(CONCHA, 86), (CS, 17)],
    'Lentilha, cozida': [(CONCHA, 86), (CS, 18)],
    'Grão-de-bico, cru': [(CS, 22)],
    'Ervilha, enlatada, drenada': [(CS, 20)],
    'Soja, extrato solúvel, pó': [(CS, 15)],
    'Frango, peito, sem pele, grelhado': [('filé médio', 100), ('colher de sopa (desfiado)', 25)],
    'Frango, peito, sem pele, cozido': [('filé médio', 100), ('colher de sopa (desfiado)', 25)],
    'Frango, coxa, sem pele, cozida': [('unidade média', 60)],
    'Frango, sobrecoxa, sem pele, assada': [('unidade média', 80)],
    'Frango, filé, à milanesa': [('filé médio', 100)],
    'Carne, bovina, patinho, sem gordura, grelhado': [('bife médio', 100), ('colher de sopa (moído)', 25)],
    'Carne, bovina, acém, moído, cozido': [(CS, 25)],
    'Carne, bovina, patinho, sem gordura, cru': [('bife médio cru', 120)],
    'Carne, bovina, contra-filé, sem gordura, grelhado': [('bife médio', 100)],
    'Carne, bovina, filé mingnon, sem gordura, grelhado': [('bife médio', 100)],
    'Carne, bovina, músculo, sem gordura, cozido': [('pedaço médio', 80)],
    'Carne, bovina, miolo de alcatra, sem gordura, grelhado': [('bife médio', 100)],
    'Salmão, sem pele, fresco, grelhado': [('filé médio', 100)],
    'Pescada, filé, frito': [('filé médio', 100)],
    'Carne, bovina, coxão mole, sem gordura, cozido': [('bife médio', 100)],
    'Porco, lombo, assado': [('fatia média', 80)],
    'Ovo, de galinha, inteiro, cozido/10minutos': [(UN, 50)],
    'Ovo, de galinha, inteiro, frito': [(UN, 50)],
    'Ovo, de galinha, inteiro, cru': [(UN, 50)],
    'Ovo, de galinha, clara, cozida/10minutos': [(UN, 30)],
    'Ovo, de codorna, inteiro, cru': [(UN, 10)],
    'Omelete, de queijo': [('unidade (2 ovos)', 120)],
    'Merluza, filé, assado': [('filé médio', 100)],
    'Salmão, filé, com pele, fresco, grelhado': [('filé médio', 100)],
    'Atum, conserva em óleo': [('lata drenada', 120), (CS, 20)],
    'Atum, fresco, cru': [('posta média', 100)],
    'Sardinha, conserva em óleo': [(UN, 25)],
    'Camarão, Rio Grande, grande, cozido': [(UN, 10), (CS, 20)],
    'Apresuntado': [(FT, 15)],
    'Presunto, sem capa de gordura': [(FT, 15)],
    'Peru, congelado, assado': [(FT, 30)],
    'Leite, de vaca, integral': [(COPO, 190), (XIC, 240)],
    'Leite, de vaca, desnatado, UHT': [(COPO, 190), (XIC, 240)],
    'Leite, de vaca, integral, pó': [(CS, 15)],
    'Leite, de vaca, desnatado, pó': [(CS, 15)],
    'Iogurte, natural': [('pote', 170)],
    'Iogurte, natural, desnatado': [('pote', 170)],
    'Iogurte, sabor morango': [('pote', 170)],
    'Queijo, minas, frescal': [(FT, 30)],
    'Queijo, minas, meia cura': [(FT, 30)],
    'Queijo, mozarela': [(FT, 15)],
    'Queijo, prato': [(FT, 15)],
    'Queijo, parmesão': [(CS, 10)],
    'Queijo, ricota': [(FT, 30), (CS, 25)],
    'Queijo, requeijão, cremoso': [(CS, 30), ('ponta de faca', 10)],
    'Creme de Leite': [(CS, 15)],
    'Banana, prata, crua': [('unidade média', 55)],
    'Banana, nanica, crua': [('unidade média', 90)],
    'Banana, maçã, crua': [('unidade média', 65)],
    'Banana, da terra, crua': [('unidade média', 200)],
    'Maçã, Fuji, com casca, crua': [('unidade média', 130)],
    'Maçã, Argentina, com casca, crua': [('unidade média', 130)],
    'Mamão, Papaia, cru': [('fatia média', 100), ('meia unidade', 150)],
    'Mamão, Formosa, cru': [('fatia média', 170)],
    'Laranja, pêra, crua': [('unidade média', 140)],
    'Laranja, baía, crua': [('unidade média', 180)],
    'Laranja, pêra, suco': [(COPO, 190)],
    'Tangerina, Poncã, crua': [('unidade média', 135)],
    'Morango, cru': [(UN, 12), (XIC, 140)],
    'Abacate, cru': [(CS, 30)],
    'Manga, Palmer, crua': [('fatia média', 80)],
    'Manga, Tommy Atkins, crua': [('fatia média', 80)],
    'Melancia, crua': [('fatia média', 200)],
    'Melão, cru': [('fatia média', 90)],
    'Uva, Itália, crua': [('cacho pequeno', 100), (UN, 8)],
    'Abacaxi, cru': [('fatia média', 75)],
    'Kiwi, cru': [(UN, 76)],
    'Goiaba, vermelha, com casca, crua': [('unidade média', 170)],
    'Caqui, chocolate, cru': [('unidade média', 110)],
    'Pêssego, Aurora, cru': [('unidade média', 110)],
    'Ameixa, crua': [('unidade média', 40)],
    'Açaí, polpa, congelada': [('pacote', 100)],
    'Açaí, polpa, com xarope de guaraná e glucose': [('tigela pequena', 200)],
    'Maracujá, cru': [('unidade média', 90)],
    'Limão, tahiti, cru': [(UN, 70)],
    'Coco, cru': [(CS, 15)],
    'Alface, crespa, crua': [('folha', 10), ('prato de sobremesa', 30)],
    'Alface, lisa, crua': [('folha', 10), ('prato de sobremesa', 30)],
    'Alface, americana, crua': [('folha', 10), ('prato de sobremesa', 30)],
    'Rúcula, crua': [('prato de sobremesa', 20)],
    'Agrião, cru': [('prato de sobremesa', 20)],
    'Espinafre, Nova Zelândia, refogado': [(CS, 25)],
    'Tomate, com semente, cru': [(FT, 15), ('unidade média', 100)],
    'Brócolis, cozido': [('ramo', 20), (CS, 15)],
    'Couve-flor, cozida': [('ramo', 30), (CS, 20)],
    'Cenoura, crua': [('colher de sopa (ralada)', 12), ('unidade média', 80)],
    'Cenoura, cozida': [(CS, 25)],
    'Abobrinha, italiana, cozida': [(CS, 25)],
    'Abóbora, cabotian, cozida': [(CS, 36)],
    'Chuchu, cozido': [(CS, 25)],
    'Pepino, cru': [(FT, 10)],
    'Beterraba, cozida': [(CS, 25), (FT, 15)],
    'Beterraba, crua': [('colher de sopa (ralada)', 16)],
    'Couve, manteiga, refogada': [(CS, 20)],
    'Repolho, branco, cru': [('colher de sopa (picado)', 10)],
    'Vagem, crua': [(CS, 20)],
    'Berinjela, cozida': [(CS, 25)],
    'Quiabo, cru': [(CS, 20)],
    'Cebola, crua': [(CS, 15)],
    'Pimentão, verde, cru': [(CS, 15)],
    'Azeite, de oliva, extra virgem': [(CS, 8), (CC, 2), ('fio', 3)],
    'Óleo, de soja': [(CS, 8), (CC, 2)],
    'Óleo, de canola': [(CS, 8), (CC, 2)],
    'Manteiga, com sal': [('ponta de faca', 5), (CC, 4)],
    'Manteiga, sem sal': [('ponta de faca', 5), (CC, 4)],
    'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)': [('ponta de faca', 5)],
    'Maionese, tradicional com ovos': [(CS, 12)],
    'Amendoim, torrado, salgado': [(CS, 17)],
    'Amendoim, grão, cru': [(CS, 17)],
    'Castanha-do-Brasil, crua': [(UN, 4)],
    'Castanha-de-caju, torrada, salgada': [(UN, 2.5)],
    'Amêndoa, torrada, salgada': [(UN, 1.2)],
    'Noz, crua': [(UN, 5)],
    'Linhaça, semente': [(CS, 10)],
    'Gergelim, semente': [(CS, 9)],
    'Mel, de abelha': [(CS, 20), (CC, 7)],
    'Açúcar, refinado': [(CC, 4), (CS, 12)],
    'Açúcar, cristal': [(CC, 4), (CS, 12)],
    'Açúcar, mascavo': [(CC, 4), (CS, 12)],
    'Doce, de leite, cremoso': [(CS, 20)],
    'Achocolatado, pó': [(CS, 15)],
    'Chocolate, ao leite': [('quadrado', 5), ('barra', 25)],
    'Chocolate, meio amargo': [('quadrado', 5), ('barra', 25)],
    'Café, infusão 10%': [('xícara de café', 50), (XIC, 240)],
    'Refrigerante, tipo cola': [('lata', 350)],
    'Bebida isotônica, sabores variados': [('garrafa', 500)],
}

GROUP = {1: 'cereais', 2: 'vegetais', 3: 'frutas', 4: 'gorduras', 5: 'proteinas', 6: 'proteinas', 7: 'laticinios',
         8: 'bebidas', 9: 'proteinas', 10: 'acucares', 11: 'outros', 12: 'outros', 13: 'preparacoes', 14: 'leguminosas',
         15: 'gorduras'}
SECTOR = {1: 'mercearia', 2: 'hortifruti', 3: 'hortifruti', 4: 'mercearia', 5: 'acougue', 6: 'acougue', 7: 'laticinios',
          8: 'mercearia', 9: 'acougue', 10: 'mercearia', 11: 'mercearia', 12: 'mercearia', 13: 'outros', 14: 'mercearia',
          15: 'mercearia'}
TUBERS = ('Batata', 'Mandioca', 'Mandioquinha', 'Inhame', 'Cará', 'Milho, verde')


def num(v):
    v = (v or '').strip()
    return round(float(v), 2) if v else 0


foods = {r['id']: r for r in csv.DictReader(open(src / 'food.csv', encoding='utf-8'))}
rows = []
missing_slugs = set(SLUGS)
missing_measures = set(MEASURES)
for n in csv.DictReader(open(src / 'nutrients.csv', encoding='utf-8')):
    f = foods[n['foodId']]
    name, cat = ' '.join(f['name'].split()), int(f['categoryId'])  # a fonte tem espaços duplos
    group, sector = GROUP[cat], SECTOR[cat]
    if cat == 2 and name.startswith(TUBERS):
        group = 'cereais'
    if cat == 1 and (name.startswith('Pão') or name.startswith('Torrada') or name.startswith('Bolo')):
        sector = 'padaria'
    if name.startswith('Leite, de coco') or name.startswith('Azeitona'):
        group = 'gorduras'
    missing_slugs.discard(name)
    missing_measures.discard(name)
    rows.append([
        SLUGS.get(name, f"taco-{f['id']}"), name, group, sector,
        num(n['kcal']), num(n['carbohydrates']), num(n['protein']), num(n['lipids']), num(n['dietaryFiber']),
        # micronutrientes: sódio, cálcio, ferro, potássio, magnésio, zinco (mg), vit. C (mg), vit. A (µg RAE)
        num(n['sodium']), num(n['calcium']), num(n['iron']), num(n['potassium']), num(n['magnesium']),
        num(n['zinc']), num(n['vitaminC']), num(n['rae']),
        [[l, g] for l, g in MEASURES.get(name, [])],
    ])

if missing_slugs:
    sys.exit(f'Nomes não encontrados na TACO (SLUGS): {sorted(missing_slugs)}')
if missing_measures:
    print('Aviso: medidas sem alimento correspondente:', sorted(missing_measures), file=sys.stderr)

header = ('// Gerado por scripts/build_taco.py a partir da Tabela TACO 4ª ed. (NEPA/UNICAMP). Não edite.\n'
          '// [id, nome, grupo, setor, kcal, cho, ptn, lip, fibra, Na, Ca, Fe, K, Mg, Zn, vitC, vitA_RAE, medidas]\n'
          'import type { TacoRow } from "./taco";\n\n')
body = 'export const TACO_ROWS: TacoRow[] = [\n' + ',\n'.join(json.dumps(r, ensure_ascii=False) for r in rows) + '\n];\n'
out.write_text(header + body, encoding='utf-8')
print(f'{len(rows)} alimentos -> {out}')
