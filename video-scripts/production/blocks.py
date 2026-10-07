# 30 blocks x 10s. Each block = 3 generated 4s clips (A, B, C) cut into 5 shots of 2s:
# shot1 = A 0-2s (base framing), shot2 = A 2-4s punched in, shot3 = B 0-2s,
# shot4 = B 2-4s punched in, shot5 = C 0-2s.
# clip tuple: (base_size, punch_size_or_None, frame description, motion)
import json

SPROUT = {
    "s1": "the small potted sprout with two tiny round leaves",
    "s2": "the small potted sprout, now with four small leaves",
    "s3": "the potted plant, now a taller stem with many green leaves",
    "s4": "the potted plant with a closed yellow flower bud on top",
    "s5": "the potted plant with its yellow flower bud just opening",
    "s6": "the potted plant in full bloom with one bright yellow flower",
}

B = []
def blk(n, role, loc, assets, sprout, vo, A, Bc, C):
    B.append(dict(n=n, arc_role=role, location=loc, assets=assets, sprout=sprout, vo=vo, clips=[A, Bc, C]))

blk(1, "hook", "loc_sleep", ["char_you"], "s1",
    "Você acorda e algo parece errado. A estação inteira está muda, sem vozes no corredor e ninguém reclamando do café espacial.",
    ("WIDE", "MEDIUM", "inside the tiny padded crew cabin, you float zipped inside a sleeping bag strapped to the wall, eyes closed", "your eyes snap open and your head turns left and right nervously"),
    ("CU", "ECU", "close on your face peeking out of the sleeping bag, one eyebrow raised, SPROUT velcroed to the wall beside you", "you cup a hand behind your ear to listen, eyebrows slowly rising"),
    ("MEDIUM", None, "low angle, you unzipping the sleeping bag and pushing off toward the cabin opening", "you drift out of the bag with both arms stretched forward"))
blk(2, "build", "loc_corridor", ["char_you"], "s1",
    "Você flutua pelos módulos procurando a tripulação, mas a cápsula de retorno sumiu e só restou um bilhete pedindo desculpas.",
    ("WIDE", "MEDIUM", "the long empty station module lined with white racks and yellow handrails, you floating in from the far end", "you glide forward slowly, head swiveling to look around"),
    ("DETAIL", "ECU", "the open round hatch at the end of the module leading to an empty docking port, a small yellow paper note stuck on its frame", "the paper note flutters in the air flow, a light blinks"),
    ("CU", None, "your shocked face with mouth wide open in a silent gasp, SPROUT floating past next to your head", "your jaw drops and your eyes go wide, hands on cheeks"))
blk(3, "build", "loc_exterior", ["prop_sprout"], "s1",
    "Você é o único ser humano fora da Terra, a quatrocentos quilômetros de altura, voando a vinte e oito mil quilômetros por hora.",
    ("WIDE", "MEDIUM", "the space station gliding above the curving blue Earth, solar panels glinting against black starry space", "the station slides slowly across the frame while Earth turns below"),
    ("CU", "ECU", "a small round station window seen from outside, your tiny face and SPROUT pressed against the glass", "you blink and press your palms on the glass, Earth light sweeping over the window"),
    ("TOP", None, "overhead view looking down on the tiny station far above the enormous Earth", "the station drifts forward, clouds sliding past underneath"))
blk(4, "build", "loc_cupola", ["char_you"], "s1",
    "Quanto tempo você aguentaria aqui sozinho? E o que acontece no trigésimo dia é a parte que ninguém te conta.",
    ("WIDE", "MEDIUM", "inside the dome-shaped window module, you hugging your knees while floating in front of the huge glowing Earth", "you slowly rotate in place, hugging your knees tighter"),
    ("CU", "ECU", "your worried face lit blue by the Earth, a single sweat drop floating away from your forehead", "the sweat drop wobbles away, your eyes dart sideways"),
    ("DETAIL", None, "SPROUT floating in front of the big round window, its leaves trembling", "the little pot spins gently, leaves quivering"))
blk(5, "build", "loc_mcc", ["char_you"], "s1",
    "A boa notícia é que o controle da missão em Houston vigia a estação vinte e quatro horas por dia.",
    ("WIDE", "MEDIUM", "an empty mission control room on Earth with rows of desks, the giant wall screen showing a live video call of you waving from the station", "the screens flicker, the orbit dot on a side map moves, you wave on the big screen"),
    ("CU", "DETAIL", "a desk console with a blinking microphone, a coffee mug and a headset", "the microphone light blinks, steam curls up from the mug"),
    ("MEDIUM", None, "on the big video screen, you holding SPROUT up to the camera with a nervous grin", "you lift the pot closer to the camera and give a shaky grin"))
blk(6, "build", "loc_mcc", ["char_you", "prop_capsule"], "s1",
    "Pelo rádio eles prometem uma missão de resgate, mas foguetes não decolam da noite para o dia e você precisará resistir semanas.",
    ("MEDIUM", "CU", "a mission control side monitor showing a rescue capsule on top of a rocket standing on a launch pad, with an hourglass symbol", "sand trickles in the hourglass symbol, steam puffs at the rocket base"),
    ("WIDE", "MEDIUM", "the mission control room with every screen showing a simple calendar grid whose pages tear off one by one", "calendar pages peel off and flutter down on the screens"),
    ("CU", None, "on the big video screen, your face sighing and then giving a determined thumbs up, SPROUT beside you", "you exhale, then raise a thumbs up with a firm nod"))
blk(7, "build", "loc_corridor", ["char_you", "char_rescuer"], "s1",
    "A estação tem o tamanho de um campo de futebol e foi planejada para uma equipe de seis ou sete pessoas, não uma.",
    ("MEDIUM", "CU", "you floating alone in the middle of the module with arms spread wide to show the empty space, SPROUT strapped to a rack", "you spread your arms wider and turn slowly in place"),
    ("WIDE", "MEDIUM", "lateral view of the whole module where six faded ghost-like outlines of crew members fade away, leaving only empty handrails", "the pale outlines fade out one by one until the module is empty"),
    ("TOP", None, "overhead view straight down the module, you tiny among the racks", "you drift slowly along the module, cables swaying"))
blk(8, "build", "loc_galley", ["char_you"], "s1",
    "Primeiro a comida. Os estoques foram calculados para a tripulação inteira, então durante meses a fome não será o seu problema.",
    ("WIDE", "MEDIUM", "the compact space kitchen module, you pulling open a drawer as dozens of silver food packets burst out like confetti", "food packets tumble out and spin through the air around you"),
    ("CU", "ECU", "your delighted face surrounded by spinning silver food packets", "you grin wide and catch a packet with one hand"),
    ("DETAIL", None, "SPROUT velcroed to the fold-out table next to a neat stack of food packets", "a packet bumps the stack, the leaves bob"))
blk(9, "build", "loc_galley", ["char_you"], "s1",
    "Astronautas comem tortilhas em vez de pão porque as migalhas flutuam e acabam entrando nos equipamentos e até nos olhos.",
    ("MEDIUM", "CU", "you at the galley table biting into a soft round tortilla, a few crumbs drifting away toward an air vent", "you chew happily as crumbs drift off toward the vent"),
    ("MACRO", "ECU", "tiny crumbs floating toward a metal air vent grille", "the crumbs swirl and get sucked toward the grille"),
    ("CU", None, "a single crumb bonking you right in the eye, SPROUT on the table behind you", "you wince and rub your eye with a fist"))
blk(10, "build", "loc_water", ["char_you", "prop_pouch"], "s1",
    "O verdadeiro problema é a água, porque quase toda gota a bordo é reciclada, incluindo suor, respiração e até xixi.",
    ("WIDE", "MEDIUM", "the life-support module wall packed with clear pipes and tanks around the glowing water recycling machine, you floating in front of it", "bubbles travel through the pipes, the machine pulses with light"),
    ("DETAIL", "MACRO", "a single shiny water droplet traveling through a clear pipe and through a filter", "the droplet slides along the pipe and passes through the glowing filter"),
    ("MEDIUM", None, "you staring suspiciously at a silver drink pouch, SPROUT clipped to a pipe nearby", "you sniff the pouch, then take a hesitant sip through the straw"))
blk(11, "build", "loc_water", ["char_you", "prop_pouch"], "s1",
    "O sistema recupera cerca de noventa e oito por cento dessa água, então o café de ontem vira a bebida de amanhã.",
    ("CU", "ECU", "your face pulling a disgusted grimace while holding the drink pouch", "you grimace, then shrug and sip again"),
    ("MEDIUM", "CU", "the round gauge on the water recycling machine with its needle climbing almost to full and a green check mark symbol", "the needle sweeps up and the check mark pops in"),
    ("TOP", None, "overhead view of you floating beside the water machine giving a thumbs up, SPROUT clipped to a pipe", "you raise a thumbs up and bob gently"))
blk(12, "build", "loc_corridor", ["char_you"], "s2",
    "Mas filtros entopem e bombas quebram, e numa tripulação normal esses consertos são divididos, só que agora cada alarme da estação é seu.",
    ("MEDIUM", "CU", "you holding a clogged dirty filter cartridge at arm's length while pinching your nose", "you pinch your nose harder and lean away from the filter"),
    ("DETAIL", "ECU", "a pump unit on the module wall sputtering and spitting a puff of grey smoke", "the pump shakes and coughs out a small smoke puff"),
    ("WIDE", None, "you surrounded by floating wrenches, a spare pump and an open toolbox, SPROUT strapped to a rack", "you grab at the floating tools as they spin around you"))
blk(13, "build", "loc_cupola", ["char_you"], "s2",
    "A estação dá uma volta na Terra a cada noventa minutos, então você vê cerca de dezesseis nasceres do sol por dia.",
    ("MEDIUM", "CU", "you floating at the dome window as the Sun peeks over the curved edge of the Earth", "a golden sunrise glow spreads along the horizon onto your face"),
    ("WIDE", "MEDIUM", "view through the dome windows of the Earth sweeping from night side to day side", "the day-night line sweeps across the planet quickly"),
    ("CU", None, "your head turning rapidly as sunrise light flashes across your face again and again, SPROUT floating beside you", "light flashes on and off across your face while you blink"))
blk(14, "build", "loc_sleep", ["char_you"], "s2",
    "Sem a rotina da equipe, seu relógio biológico se perde, você cochila em horários aleatórios e esquece até que dia é hoje.",
    ("CU", "ECU", "you dozing upside down in the cabin, a little drool bubble floating from your mouth", "the drool bubble wobbles and pops, you snore softly"),
    ("MEDIUM", "CU", "you tangled sideways in a cable while sleeping", "you jolt awake and flail inside the cable loop"),
    ("DETAIL", None, "SPROUT on the cabin wall with a sleeping mask floating past it", "the sleep mask drifts by and the leaves sway"))
blk(15, "build", "loc_corridor", ["char_you", "prop_pouch"], "s2",
    "Então você faz o que astronautas de verdade fazem e segue o cronograma do controle da missão como se fosse lei.",
    ("MEDIUM", "CU", "you saluting while holding a checklist clipboard whose paper keeps unrolling longer and longer", "the paper unrolls down past your feet while you salute"),
    ("DETAIL", "ECU", "a wall light panel switching from warm daytime yellow to dim night blue", "the panel light fades smoothly from yellow to blue"),
    ("WIDE", None, "you marching in mid-air down the module like a soldier, drink pouch clipped to your belt, SPROUT on a rack", "you march with exaggerated knee lifts while floating forward"))
blk(16, "build", "loc_gym", ["char_you"], "s2",
    "Seu corpo começa a sumir, porque sem gravidade os ossos podem perder cerca de um por cento da massa a cada mês.",
    ("WIDE", "MEDIUM", "the exercise module with treadmill and weight machine, you floating past with floppy noodle arms", "your arms wobble loosely like noodles as you drift"),
    ("CU", "ECU", "a simple cartoon x-ray view of your leg bone with small holes appearing in it", "little holes pop into the bone one after another"),
    ("MEDIUM", None, "you poking your arm muscle, which deflates like a balloon, SPROUT strapped to the treadmill rail", "the muscle sags as you poke it, your face drops"))
blk(17, "build", "loc_gym", ["char_you"], "s3",
    "Por isso astronautas se exercitam cerca de duas horas por dia, correndo numa esteira presos com elásticos para não sair flutuando.",
    ("MEDIUM", "CU", "you jogging on the treadmill held down by bungee cords clipped to a harness on your hips", "you run in place, the bungee cords stretching with each step"),
    ("DETAIL", "MACRO", "sweat droplets floating off your forehead as little spheres", "the round droplets drift away and wobble"),
    ("WIDE", None, "you pushing the cylinder weight machine with huge effort, SPROUT strapped to the machine frame", "you push the bar up slowly, cheeks puffed"))
blk(18, "build", "loc_sleep", ["char_you", "prop_sock"], "s3",
    "Os líquidos do corpo sobem para a cabeça, seu rosto fica inchado e suas pernas ficam finas como as de um passarinho.",
    ("MEDIUM", "CU", "you looking into a small cabin mirror at your face puffed up round like a balloon", "your cheeks puff a little more as you stare"),
    ("WIDE", "MEDIUM", "you floating in the cabin with a big round head on top of skinny bird-like legs, SPROUT on the wall", "you wiggle your thin legs and look down at them"),
    ("DETAIL", None, "your very thin legs in grey socks kicking like a bird's legs", "the legs kick and twitch comically"))
blk(19, "build", "loc_corridor", ["char_you", "prop_sprout"], "s3",
    "Na segunda semana, às três da manhã, um alarme dispara e a tela vermelha mostra uma única palavra assustadora: atmosfera.",
    ("CU", "ECU", "a module wall panel flashing red with a big warning triangle symbol", "the warning triangle flashes red on and off"),
    ("WIDE", "MEDIUM", "the whole module bathed in pulsing red light, you shooting in from the far end in pajamas", "red light pulses as you zoom forward"),
    ("CU", None, "your terrified face lit red, SPROUT floating behind you", "your eyes widen and your hair stands up"))
blk(20, "build", "loc_hatch", ["char_you"], "s3",
    "Astronautas treinam para três pesadelos: incêndio, vazamento de ar causado por lixo espacial e gases tóxicos vindos do sistema de resfriamento.",
    ("WIDE", "MEDIUM", "the docking node room with round hatches, a wall panel lighting up three big symbols one by one: a flame, a swirling air leak, a skull", "the three symbols light up in sequence"),
    ("DETAIL", "ECU", "a tiny pebble of space junk streaking toward a station hull panel", "the pebble speeds in and sparks against the panel"),
    ("CU", None, "a cooling pipe hissing out a puff of green gas next to you, SPROUT on the wall", "the green gas puffs out and you lean back"))
blk(21, "build", "loc_hatch", ["char_you", "char_rescuer"], "s3",
    "Cada emergência exige uma equipe, um medindo a pressão, outro fechando escotilhas e um terceiro falando com a Terra, e você faz tudo.",
    ("MEDIUM", "CU", "you frantically swimming between wall panels while a headset cord tangles around you", "you spin and the cord wraps around your arm"),
    ("DETAIL", "ECU", "your hand spinning a round hatch wheel shut", "the wheel turns fast and locks"),
    ("WIDE", None, "you stretched like a starfish between the pressure gauge, a hatch wheel and the headset microphone, SPROUT on the wall", "you strain to reach all three at once"))
blk(22, "build", "loc_mcc", ["char_you"], "s3",
    "Por sorte era só um sensor com defeito, e o controle da missão te guia com calma até o alarme finalmente silenciar.",
    ("CU", "ECU", "a mission control monitor showing a small sensor icon with a red cross mark", "the red cross flips into a green check mark"),
    ("MEDIUM", "CU", "the big screen video call: you wearing a headset, listening and nodding, SPROUT beside you", "you nod along slowly and exhale"),
    ("WIDE", None, "the empty mission control room as every screen turns from red to calm green", "the screens change color from red to green one by one"))
blk(23, "turn", "loc_cupola", ["char_you"], "s4",
    "Lembra do trigésimo dia? O maior perigo de ficar sozinho no espaço não são os ossos nem a água, é a sua mente.",
    ("MEDIUM", "CU", "you floating very still at the dome window, small against the dark night side of the Earth", "you drift a little closer to the glass, perfectly quiet"),
    ("ECU", "MACRO", "your eyes glistening, the planet reflected in them", "a slow blink, the reflection shimmers"),
    ("WIDE", None, "the dome window seen from inside, your lonely silhouette and SPROUT against the vast Earth", "the Earth turns slowly while you stay still"))
blk(24, "build", "loc_galley", ["char_you"], "s4",
    "Pesquisadores que estudam bases na Antártida e submarinos chamam isso de efeito do terceiro quarto, quando o ânimo despenca no meio da missão.",
    ("CU", "ECU", "you slumped at the galley table with your chin on your hand, looking bored", "you sigh deeply and your head slides off your hand"),
    ("DETAIL", "MACRO", "a tablet showing a simple line chart that dips deep in the middle, no numbers", "the line draws itself and dives into the dip"),
    ("MEDIUM", None, "you doodling a snowy research hut and a little submarine on the tablet, SPROUT on the table", "you sketch lazily with a stylus"))
blk(25, "build", "loc_galley", ["char_you", "prop_sock"], "s4",
    "Sem ninguém por perto, você começa a conversar com um fantoche de meia, que sinceramente parece bem preocupado com você.",
    ("MEDIUM", "CU", "you at the galley table with a striped sock puppet on your hand, gesturing at it", "you gesture with your free hand, the puppet tilts its head"),
    ("DETAIL", "ECU", "the sock puppet's big button eyes looking worried", "the puppet's head tilts slowly sideways"),
    ("WIDE", None, "you and the sock puppet sharing a floating snack at the table, SPROUT beside them", "a snack floats between you and the puppet"))
blk(26, "build", "loc_cupola", ["char_you"], "s4",
    "Muitos astronautas descrevem algo que salva a cabeça: olhar a Terra frágil, sem fronteiras, sabendo que todo mundo que você ama está lá.",
    ("CU", "ECU", "your face softening into a gentle smile as city lights glow on the Earth below", "your smile grows slowly, light glinting in your eyes"),
    ("WIDE", "MEDIUM", "the dome windows framing the Earth with its thin glowing blue atmosphere line and no borders", "the Earth turns slowly, the atmosphere line shimmering"),
    ("DETAIL", None, "SPROUT floating against the window with the planet behind it", "the bud sways softly"))
blk(27, "build", "loc_exterior", ["prop_sprout"], "s4",
    "Isso se chama efeito visão geral, e todo dia você liga para a família e fotografa sua cidade lá de cima.",
    ("MEDIUM", "CU", "the station gliding over a coastline at night sparkling with city lights", "the station slides past as city lights twinkle below"),
    ("DETAIL", "ECU", "a camera lens poking out of a round station window, SPROUT visible behind the glass", "the camera flashes twice"),
    ("WIDE", None, "the station tiny over the curve of the Earth at sunrise", "the sunrise glow spreads across the horizon"))
blk(28, "build", "loc_exterior", ["prop_capsule"], "s4",
    "No dia quarenta e cinco um ponto brilhante cresce na janela, e o rádio chia: cápsula de resgate a duzentos metros.",
    ("CU", "ECU", "a bright white dot growing larger against the black starry sky, SPROUT in the station window at the edge of frame", "the dot grows and glints"),
    ("MEDIUM", "CU", "the white rescue capsule with its orange heat shield approaching, small thruster puffs", "thrusters puff as the capsule eases closer"),
    ("WIDE", None, "the capsule lining up with the station docking port above the blue Earth", "the capsule glides in slowly toward the port"))
blk(29, "build", "loc_hatch", ["char_you", "char_rescuer"], "s5",
    "A cápsula se acopla sozinha, a escotilha se abre e você abraça o resgatista com tanta força que os dois giram pelo módulo.",
    ("MEDIUM", "CU", "the big round docking hatch swinging open with bright light pouring in", "the hatch swings open and light floods the room"),
    ("WIDE", "MEDIUM", "you and the rescuer astronaut hugging tightly and spinning together through the docking node", "you both spin around in a tight hug"),
    ("CU", None, "the rescuer's friendly smile as you hold up SPROUT", "the rescuer laughs and gives a thumbs up"))
blk(30, "payoff", "loc_home", ["char_you"], "s6",
    "De volta à Terra até uma caneta parece pesada, mas seu broto floresceu, e lá em cima passa uma estrela que não pisca.",
    ("WIDE", "MEDIUM", "a calm backyard at night, you sitting in the orange lawn chair looking up at the starry sky", "you lean back slowly, stars twinkling above"),
    ("DETAIL", "ECU", "a pen falling from your hand and landing in the grass while your fingers stay open", "the pen drops straight down and bounces in the grass"),
    ("CU", None, "SPROUT on the chair's armrest in front of the night sky where one bright steady light glides across", "the steady light glides across the sky as the flower sways"))

def shots(b):
    out = []
    s = SPROUT[b["sprout"]]
    for i, (base, punch, desc, motion) in enumerate(b["clips"]):
        d = desc.replace("SPROUT", s)
        out.append(f"{base}: {d}")
        if punch:
            out.append(f"{punch} punch-in on the same shot as {motion}")
    return out

def manifest():
    blocks = []
    for b in B:
        blocks.append(dict(n=b["n"], arc_role=b["arc_role"], vo_line=b["vo"], location=b["location"],
                           through_line_state=SPROUT[b["sprout"]], shots=shots(b),
                           assets_used=[b["location"]] + b["assets"] + (["prop_sprout"] if "prop_sprout" not in b["assets"] else [])))
    builds = [b["n"] for b in B if b["arc_role"] == "build"]
    return dict(topic="O que aconteceria se você ficasse sozinho na Estação Espacial Internacional",
                genre="education", animation_mode="fully_animated", channel_type="Explainer",
                style="Bright flat 2D cartoon explainer (custom)",
                through_line=dict(name="a potted sprout aboard the station", asset="prop_sprout",
                                  progression="two leaves, then four leaves, a taller stem, a bud, an opening bud",
                                  resolution="it blooms with a yellow flower back on Earth"),
                arc=dict(hook=1, build=builds, turn=23, payoff=30), blocks=blocks,
                sources=["https://space.com/astronaut-pee-iss-water-recycling-98-percent-milestone",
                         "https://pubmed.ncbi.nlm.nih.gov/15125798/",
                         "https://www.nasa.gov/international-space-station/space-station-facts-and-figures/",
                         "https://en.wikipedia.org/wiki/Overview_effect",
                         "https://en.wikipedia.org/wiki/Third-quarter_phenomenon"])

if __name__ == "__main__":
    import sys
    json.dump(manifest(), sys.stdout, ensure_ascii=False, separators=(",", ":"))
