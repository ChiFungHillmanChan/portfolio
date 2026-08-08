#!/usr/bin/env bash
# Dev-only. Answers one question: does the key in .gemini-key reach the two
# TTS APIs we care about?
#
#   generativelanguage.googleapis.com  — Gemini Developer API (what
#                                        generate-granny-voice.mjs uses today).
#                                        No official Cantonese TTS support.
#   texttospeech.googleapis.com        — Cloud Text-to-Speech, which does have
#                                        30 yue-HK Chirp3-HD voices including
#                                        Gacrux, the voice already in use.
#
# Prints status codes and voice counts only. Never prints the key.
# Usage: bash scripts/da-siu-yan/probe-tts.sh
set -uo pipefail
cd "$(dirname "$0")/../.."

KEYFILE=.gemini-key
if [ ! -s "$KEYFILE" ]; then
  echo "No $KEYFILE (or it is empty). Create it in your own terminal:"
  echo "  printf '%s' 'YOUR_KEY' > $PWD/$KEYFILE && chmod 600 $PWD/$KEYFILE"
  exit 1
fi
KEY=$(tr -d '[:space:]' < "$KEYFILE")
if [ -z "$KEY" ]; then echo "$KEYFILE has no non-whitespace content."; exit 1; fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

probe () {  # name url
  local name=$1 url=$2 code
  code=$(curl -s -o "$tmp/$name.json" -w '%{http_code}' \
    -H "X-Goog-Api-Key: $KEY" "$url")
  printf '%-26s HTTP %s\n' "$name" "$code"
  python3 - "$tmp/$name.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception as e:
    print(f'    (unparseable response: {e})'); raise SystemExit
if 'error' in d:
    err = d['error']
    print(f"    error: {err.get('status','?')} — {err.get('message','?')[:220]}")
elif 'voices' in d:
    vs = d['voices']
    print(f"    {len(vs)} voice(s)")
    for v in vs:
        if 'Gacrux' in v.get('name', ''):
            print(f"    -> {v['name']}  {v.get('ssmlGender','?')}  {v.get('naturalSampleRateHertz','?')}Hz")
elif 'models' in d:
    tts = [m['name'] for m in d['models'] if 'tts' in m['name']]
    print(f"    {len(d['models'])} model(s), {len(tts)} with 'tts' in the name")
    for n in tts[:6]:
        print(f"    -> {n}")
else:
    print(f"    keys: {list(d)[:8]}")
PY
}

echo "== Cloud Text-to-Speech: are the yue-HK voices reachable with this key? =="
probe cloud-tts-yue-HK 'https://texttospeech.googleapis.com/v1/voices?languageCode=yue-HK'
echo
echo "== Gemini Developer API: sanity check the key works at all =="
probe gemini-models 'https://generativelanguage.googleapis.com/v1beta/models'
