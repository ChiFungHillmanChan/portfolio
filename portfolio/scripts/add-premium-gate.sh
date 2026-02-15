#!/bin/bash
# Adds premium-gate.js and tab gating to all topic files
# Run from portfolio/ directory

TOPICS_DIR="src/game/system-design/topics"

for file in "$TOPICS_DIR"/*.html; do
  filename=$(basename "$file")

  # Skip welcome.html (no premium gating on welcome page)
  if [ "$filename" = "welcome.html" ]; then
    echo "SKIP (welcome): $filename"
    continue
  fi

  # Skip if already has premium-gate.js
  if grep -q "premium-gate.js" "$file"; then
    echo "SKIP (already has gate): $filename"
    continue
  fi

  # 1. Add premium-gate.js script before the existing <script> tag
  sed -i '' 's|<script>|<script src="../premium-gate.js"></script>\n  <script>|' "$file"

  # 2. Mark 3rd and 4th tab buttons as premium
  awk '
  BEGIN { tab_count = 0 }
  /class="tab-btn"/ && !/data-premium/ {
    tab_count++
    if (tab_count >= 3) {
      sub(/class="tab-btn"/, "class=\"tab-btn\" data-premium=\"true\"")
    }
  }
  { print }
  ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"

  echo "UPDATED: $filename"
done
