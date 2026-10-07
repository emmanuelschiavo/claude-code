#!/usr/bin/env bash
# Runs inside the Higgsfield sandbox: builds the 9 blocks, converts the takes,
# re-validates the script (writes script.lock) and runs the workflow assembler.
set -euo pipefail
R="$1"   # raw.githubusercontent base for this directory
B=https://d8j0ntlcm91z4.cloudfront.net/user_3KNZoZLUXgJGISXbJrjLDVUiiIg
mkdir -p work/blocks work/voices work/raw work/output
for f in blocks.py build_blocks.sh final_cut.txt; do curl -fsSL "$R/$f" -o "$f"; done
python3 blocks.py > script_manifest.json
python3 "$HF_WORKFLOWS/faceless-video/scripts/validate_motion_script.py" --script script_manifest.json --duration-seconds 90 >/dev/null
: > pairs.txt
grep -v '^#' final_cut.txt | while read -r n a b c v; do
  for s in "$a" "$b" "$c"; do [ -s "work/raw/$s.mp4" ] || curl -fsSL --retry 3 "$B/$s.mp4" -o "work/raw/$s.mp4"; done
  [ -s "work/blocks/block$n.mp4" ] || bash build_blocks.sh "work/blocks/block$n.mp4" "work/raw/$a.mp4" "work/raw/$b.mp4" "work/raw/$c.mp4"
  [ -s "work/voices/take$n.mp3" ] || curl -fsSL --retry 3 "$B/$v.mp3" -o "work/voices/take$n.mp3"
  ffmpeg -nostdin -hide_banner -loglevel error -i "work/voices/take$n.mp3" -ac 1 -ar 24000 \
    -af "areverse,atrim=start=0.030,asetpts=N/SR/TB,afade=t=in:st=0:d=0.060,areverse" -y "work/voices/voice$n.wav"
  echo "work/blocks/block$n.mp4 work/voices/voice$n.wav" >> pairs.txt
done
bash "$HF_WORKFLOWS/faceless-video/scripts/assemble_final.sh" --out work/output/final_clean.mp4 --blocks 9 \
  --manifest pairs.txt --script script_manifest.json --accept-soft-blocks 4
