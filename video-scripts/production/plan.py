import json, sys

STYLE = ("bright flat 2D cartoon explainer illustration with clean smooth medium-weight dark navy outlines, "
         "rounded friendly character shapes with big expressive white eyes and simple oval faces, soft cel shading "
         "with exactly one subtle shadow tone per color, highly saturated cheerful palette of sky blue, sunny yellow, "
         "leaf green and white with deep navy for space, one signature accent of hot orange on key objects, simple "
         "clean graphic backgrounds with gentle soft gradients and minimal detail, crisp vector finish, "
         "non-photorealistic family-friendly educational cartoon")

YOU = ("young adult astronaut with short messy dark-brown hair, big round eyes, light-brown skin, navy-blue polo "
       "shirt with a round hot-orange mission patch on the chest, khaki cargo pants and grey socks, no helmet")
RESCUER = ("adult astronaut in a white pressure suit with a sky-blue stripe, helmet visor raised, friendly smile, "
           "short black beard")

ASSETS = {
    # key: (aspect, prompt)
    "char_you": ("2:3", f"Full-body character centered on a plain flat solid pale-blue background, in THIS EXACT style: {STYLE}. Character: {YOU}, floating pose, arms slightly raised. No text, no watermark."),
    "char_rescuer": ("2:3", f"Full-body character centered on a plain flat solid pale-blue background, in THIS EXACT style: {STYLE}. Character: {RESCUER}, floating pose, waving. No text, no watermark."),
    "loc_sleep": ("16:9", f"Interior of a tiny padded crew sleeping cabin on a space station, in THIS EXACT style: {STYLE}. A sleeping bag strapped upright to the back wall (anchor object, center), a small laptop on a bracket, a reading lamp, soft padded walls. Empty room — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_corridor": ("16:9", f"Interior of a long cylindrical space station module, in THIS EXACT style: {STYLE}. White equipment racks on all four sides, yellow handrails, bundled cables, soft blue LED strips, a round open hatch at the far end (anchor object, center). Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_exterior": ("16:9", f"Exterior view of a space station orbiting above the curving blue Earth, in THIS EXACT style: {STYLE}. Long truss with large golden-blue solar panels, white cylindrical modules (anchor object, center), black starry space, thin glowing blue atmosphere line on Earth. No people. Wide establishing. No text, no logos, no watermark."),
    "loc_cupola": ("16:9", f"Interior of a dome-shaped observation module on a space station, in THIS EXACT style: {STYLE}. Six trapezoid windows around one big round central window (anchor object, center) showing the huge glowing blue Earth below, handrails around the frame. Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_mcc": ("16:9", f"Interior of a mission control room on Earth, in THIS EXACT style: {STYLE}. Rows of curved desks with consoles and headsets, a giant main wall screen showing a world map with a curving orbit line (anchor object, center), smaller side screens. Empty — no people, no characters, no figures. Wide establishing. No text, no letters, no numbers, no watermark."),
    "loc_galley": ("16:9", f"Interior of a compact space station kitchen module, in THIS EXACT style: {STYLE}. Walls of small drawers holding silver food packets, a fold-out table with velcro patches (anchor object, center), a water dispenser, yellow handrails. Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_water": ("16:9", f"Interior of a space station life-support module, in THIS EXACT style: {STYLE}. A wall of clear pipes, round tanks and valves around a glowing water recycling machine with a round gauge (anchor object, center), soft blue lighting. Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_gym": ("16:9", f"Interior of a space station exercise module, in THIS EXACT style: {STYLE}. A treadmill with a harness and bungee cords (anchor object, center), a resistance weight machine with two cylinders, a stationary bike without a seat, handrails. Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_hatch": ("16:9", f"Interior of a space station docking node, in THIS EXACT style: {STYLE}. A cube-shaped junction room with round hatches on every wall, one big round docking hatch with a hand-wheel (anchor object, center), a wall panel with a pressure gauge, a headset hanging on a hook. Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "loc_home": ("16:9", f"A calm backyard at night on Earth, in THIS EXACT style: {STYLE}. Green lawn, a wooden fence, a cozy house with warm lit windows, an empty orange lawn chair (anchor object, center), a deep navy starry sky. Empty — no people, no characters, no figures. Wide establishing. No text, no watermark."),
    "prop_sprout": ("1:1", f"A single isolated prop centered on a plain flat solid pale-yellow background, in THIS EXACT style: {STYLE}. Object: a small clear plastic plant pot with dark soil and a tiny green sprout with two round leaves, an orange velcro strap around the pot. No hands, no scene, no other objects. No text, no watermark."),
    "prop_capsule": ("1:1", f"A single isolated prop centered on a plain flat solid pale-blue background, in THIS EXACT style: {STYLE}. Object: a rounded white crew space capsule with a hot-orange heat shield base, small round windows and a docking ring on top. No logos, no text, no other objects. No watermark."),
    "prop_pouch": ("1:1", f"A single isolated prop centered on a plain flat solid pale-blue background, in THIS EXACT style: {STYLE}. Object: a silver foil drink pouch with a clear straw and an orange clip. No hands, no text, no other objects. No watermark."),
    "prop_sock": ("1:1", f"A single isolated prop centered on a plain flat solid pale-yellow background, in THIS EXACT style: {STYLE}. Object: a striped orange-and-white sock puppet with two big button eyes and a worried look. No hands, no text, no other objects. No watermark."),
}

if __name__ == "__main__":
    out = [{"index": i, "key": k, "params": {"model": "seedream_v5_pro", "resolution": "1k", "aspect_ratio": a, "prompt": p}}
           for i, (k, (a, p)) in enumerate(ASSETS.items(), start=1)]
    json.dump(out, sys.stdout, ensure_ascii=False)
