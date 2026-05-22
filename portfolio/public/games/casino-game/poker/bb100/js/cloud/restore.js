// restore.js — downloads a saved session and offers original .txt files for download.

import { apiCall } from "../auth/api-client.js";

const FILE_SENTINEL_RE = /\n=== FILE: ([^=]+) ===\n/g;

async function fetchAndUngzip(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const ds = new DecompressionStream("gzip");
  return new Response(res.body.pipeThrough(ds)).text();
}

function splitConcatenatedFiles(text) {
  // text format: \n=== FILE: name1 ===\n<contents>\n=== FILE: name2 ===\n<contents>...
  // Returns: Array<{name, text}>
  const matches = [...text.matchAll(FILE_SENTINEL_RE)];
  if (matches.length === 0) return [{ name: "session.txt", text }];
  const files = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    files.push({ name: matches[i][1].trim(), text: text.slice(start, end) });
  }
  return files;
}

function triggerDownload(name, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function restoreSessionToBrowser(sessionId) {
  const sign = await apiCall("sign-download", { sessionId, file: "hands" });
  if (!sign.ok) throw new Error(sign.error || "sign-download failed");
  const fullText = await fetchAndUngzip(sign.url);
  const files = splitConcatenatedFiles(fullText);
  if (files.length === 0) throw new Error("session had no files");

  // Prompt user: download each file individually
  const confirmed = confirm(
    `Restore ${files.length} file${files.length === 1 ? "" : "s"} from this session?\n\n` +
    files.map((f) => `  ${f.name} (${(f.text.length / 1024).toFixed(1)} KB)`).join("\n") +
    `\n\nFiles will download to your browser's Downloads folder.`
  );
  if (!confirmed) return;

  for (const f of files) {
    triggerDownload(f.name, f.text);
    await new Promise((r) => setTimeout(r, 200)); // stagger so browser doesn't block
  }
}
