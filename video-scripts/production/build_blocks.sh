#!/usr/bin/env bash
# Builds one 10s block from three 4s clips: A0-2 | A2-4 punch-in | B0-2 | B2-4 punch-in | C0-2.
# usage: build_blocks.sh <out.mp4> <clipA> <clipB> <clipC>
set -euo pipefail
out="$1"; a="$2"; b="$3"; c="$4"
punch="crop=iw/1.3:ih/1.3,scale=1280:720"
base="scale=1280:720"
ffmpeg -nostdin -hide_banner -loglevel error -y -i "$a" -i "$b" -i "$c" \
  -f lavfi -t 10 -i "anullsrc=r=44100:cl=stereo" \
  -filter_complex "\
[0:v]trim=0:2,setpts=PTS-STARTPTS,${base},fps=24,setsar=1[s1];\
[0:v]trim=2:4,setpts=PTS-STARTPTS,${punch},fps=24,setsar=1[s2];\
[1:v]trim=0:2,setpts=PTS-STARTPTS,${base},fps=24,setsar=1[s3];\
[1:v]trim=2:4,setpts=PTS-STARTPTS,${punch},fps=24,setsar=1[s4];\
[2:v]trim=0:2,setpts=PTS-STARTPTS,${base},fps=24,setsar=1[s5];\
[s1][s2][s3][s4][s5]concat=n=5:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -map 3:a -t 10 -c:v libx264 -preset veryfast -crf 18 -c:a aac -b:a 128k "$out"
