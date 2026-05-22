// progress-bar.js — simple shared progress bar for parse + cloud-upload phases.
// Renders into #uploadProgress. Use show()/update()/hide() from anywhere.

const HOST_ID = "uploadProgress";

function ensureNode() {
  let el = document.getElementById(HOST_ID);
  if (el) return el;
  el = document.createElement("div");
  el.id = HOST_ID;
  el.className = "progress-bar-host";
  el.hidden = true;
  el.innerHTML = `
    <div class="pb-label">
      <span class="pb-stage"></span>
      <span class="pb-count"></span>
    </div>
    <div class="pb-track"><div class="pb-fill"></div></div>
  `;
  // Mount inside #uploadStatus' parent so it sits naturally in the upload tab
  const anchor = document.getElementById("uploadStatus");
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  } else {
    document.body.appendChild(el);
  }
  return el;
}

export function showProgress({ stage, current = 0, total = 0, indeterminate = false }) {
  const host = ensureNode();
  host.hidden = false;
  host.querySelector(".pb-stage").textContent = stage || "Working…";
  const countEl = host.querySelector(".pb-count");
  const fill = host.querySelector(".pb-fill");
  if (indeterminate || !total) {
    countEl.textContent = "";
    fill.classList.add("indeterminate");
    fill.style.width = "100%";
  } else {
    fill.classList.remove("indeterminate");
    const pct = Math.min(100, Math.max(0, (current / total) * 100));
    fill.style.width = pct.toFixed(1) + "%";
    countEl.textContent = `${current.toLocaleString()} / ${total.toLocaleString()}`;
  }
}

export function updateProgress(args) {
  showProgress(args);
}

export function hideProgress() {
  const host = document.getElementById(HOST_ID);
  if (host) host.hidden = true;
}

// Helper to yield to the browser so the progress bar paints
export function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
