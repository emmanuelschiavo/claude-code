"""Builds keyframe (seedream), clip (seedance 1.5) and narration request payloads."""
import json, re, sys
from plan import STYLE
from blocks import B, SPROUT

ASSET_JOBS = {
    "char_you": "28d55985-3149-433d-ab51-92b2306d0c8b",
    "char_rescuer": "0efde7ed-fa31-4086-8c3d-637e90232647",
    "loc_sleep": "9f3eceb1-7ee5-42e5-b4ba-f02377edb4bc",
    "loc_corridor": "1acc243a-f58f-4cd1-9649-fccfa12777fe",
    "loc_exterior": "6ddffe1d-8417-499d-984f-6e7218c14666",
    "loc_cupola": "41f5dec0-9374-4b28-995c-dcf17f5f8337",
    "loc_mcc": "b608e3a9-8623-492b-8c70-de1e68849e1f",
    "loc_galley": "a01003fd-4f10-49f1-84a8-2b1a6c1346a6",
    "loc_water": "c3777633-dd22-4599-8f20-756f28249613",
    "loc_gym": "11009d54-7083-465d-935b-b0c15cdf959f",
    "loc_hatch": "f66490f1-b177-4ed0-bd50-0f8910801c5e",
    "loc_home": "3013c61e-5b82-4e1d-9225-42fa4e946849",
    "prop_sprout": "dba01f72-1a24-4864-89f8-301b4b625907",
    "prop_capsule": "76e7c31e-c077-4db9-ba8b-2c102e61d37c",
    "prop_pouch": "139dc643-1002-4374-bbe5-886dd1c2e3ef",
    "prop_sock": "634b716a-f66d-4188-8174-aaec2b241a3c",
}
SIZE_WORDS = {"TOP": "overhead top-down", "DETAIL": "detail insert", "MACRO": "macro", "ECU": "extreme close-up",
              "CU": "close-up", "MEDIUM": "medium", "WIDE": "wide"}
DELIVERY = "warm friendly Brazilian Portuguese storyteller, natural pt-BR accent, clear bright timbre, relaxed unhurried pace"


def third_person(text):
    text = re.sub(r"\byour\b", "the astronaut's", text)
    text = re.sub(r"\byou\b", "the astronaut", text)
    return text


def refs_for(block, desc):
    keys = [block["location"]]
    low = desc.lower()
    if re.search(r"\byou(r)?\b", low):
        keys.append("char_you")
    if "rescuer" in low:
        keys.append("char_rescuer")
    if "SPROUT" in desc or "potted plant" in low:
        keys.append("prop_sprout")
    for word, key in (("pouch", "prop_pouch"), ("sock", "prop_sock"), ("capsule", "prop_capsule")):
        if word in low and key not in keys:
            keys.append(key)
    return keys


def frames():
    out = []
    for b in B:
        for c, (base, punch, desc, motion) in enumerate(b["clips"], start=1):
            keys = refs_for(b, desc)
            d = third_person(desc.replace("SPROUT", SPROUT[b["sprout"]]))
            who = (" The astronaut is the young astronaut in the navy polo shirt with the orange patch from the reference."
                   if "char_you" in keys else "")
            prompt = (f"A single 16:9 animation keyframe in THIS EXACT style: {STYLE}. {SIZE_WORDS[base]} shot: {d}."
                      f"{who} Characters, objects and the setting match their reference images exactly (same design, "
                      f"colors and outfit). Mouths closed, nobody talks. No text, no letters, no captions, no watermark.")
            out.append({"index": b["n"] * 10 + c, "params": {
                "model": "seedream_v5_pro", "resolution": "1k", "aspect_ratio": "16:9", "prompt": prompt,
                "medias": [{"role": "image_references", "value": ASSET_JOBS[k]} for k in keys]}})
    return out


def clips(frame_jobs):
    out = []
    for b in B:
        for c, (base, punch, desc, motion) in enumerate(b["clips"], start=1):
            idx = b["n"] * 10 + c
            prompt = (f"Simple limited 2D cartoon animation of this exact illustration, same flat style, outlines and colors. "
                      f"{third_person(motion)}. Motion starts on the first frame and stays continuous. "
                      f"Single shot, steady camera with a gentle drift, no cuts. Characters only emote and gesture, mouths "
                      f"closed, nobody talks. No text, no new characters, no style change, no photorealism.")
            out.append({"index": idx, "params": {
                "model": "seedance1_5", "duration": 4, "resolution": "720p", "aspect_ratio": "16:9",
                "generate_audio": False, "prompt": prompt,
                "medias": [{"role": "start_image", "value": frame_jobs[str(idx)]}]}})
    return out


def voices(voice_id, voice_type):
    return [{"index": b["n"], "params": {
        "model": "text2speech_v2", "variant": "elevenlabs", "voice_id": voice_id, "voice_type": voice_type,
        "prompt": f"[ {DELIVERY}, starts speaking immediately] [00:00-00:09] {b['vo']}"}} for b in B]


if __name__ == "__main__":
    what = sys.argv[1]
    if what == "frames":
        data = frames()
    elif what == "clips":
        data = clips(json.load(open(sys.argv[2])))
    else:
        data = voices(*open("voice.lock").read().split())
    json.dump(data, sys.stdout, ensure_ascii=False)
