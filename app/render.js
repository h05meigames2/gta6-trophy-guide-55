// Rendering: tracker table, detail pane, roadmap page and missables page.
import { KIND_LABELS, ROADMAP_STAGES, CHECKLIST_100 } from "./roadmap.js";

const GRADE_ORDER = ["platinum", "gold", "silver", "bronze"];

export function isSpoiled(trophy, progress) {
  return progress.spoiler && trophy.kind === "story" && !progress.earned[trophy.id];
}

export function trophyMatches(trophy, state, progress) {
  if (state.kind === "online") return false;
  if (state.kind === "missable" && !trophy.missable) return false;
  if (state.kind !== "all" && state.kind !== "missable" && trophy.kind !== state.kind) return false;
  if (state.grade !== "all" && trophy.grade !== state.grade) return false;
  if (state.search) {
    const hay = `${trophy.name} ${trophy.description}`.toLowerCase();
    if (!hay.includes(state.search.toLowerCase())) return false;
  }
  return true;
}

export function renderProgress(trophies, progress, els) {
  const earned = trophies.filter((t) => progress.earned[t.id]).length;
  els.earnedCount.textContent = String(earned);
  els.progressFill.style.width = `${Math.round((earned / trophies.length) * 100)}%`;
  els.gradeCounts.textContent = GRADE_ORDER.map((g) => {
    const total = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && progress.earned[t.id]).length;
    return `${g} ${got}/${total}`;
  }).join(" · ");
  const next = trophies
    .slice()
    .sort((a, b) => (a.roadmap - b.roadmap) || (a.id - b.id))
    .find((t) => !progress.earned[t.id]);
  els.nextUp.innerHTML = next
    ? `Next up: <b>${escapeHtml(next.name)}</b> — ${escapeHtml(next.description)}`
    : "Platinum earned — every trophy is yours.";
}

export function renderChips(state, els, onPick) {
  els.kindChips.innerHTML = "";
  for (const kind of Object.keys(KIND_LABELS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = KIND_LABELS[kind];
    if (state.kind === kind) button.classList.add("active");
    button.addEventListener("click", () => onPick(kind));
    els.kindChips.appendChild(button);
  }
}

export function renderRows(trophies, state, progress, els, onSelect, onToggle) {
  const shown = trophies.filter((t) => trophyMatches(t, state, progress));
  els.rows.innerHTML = "";
  for (const trophy of shown) {
    const row = document.createElement("tr");
    row.dataset.id = String(trophy.id);
    if (state.selectedId === trophy.id) row.classList.add("selected");
    if (progress.earned[trophy.id]) row.classList.add("earnedRow");

    const checkCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "earn";
    checkbox.checked = Boolean(progress.earned[trophy.id]);
    checkbox.setAttribute("aria-label", `Mark ${trophy.name} earned`);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      onToggle(trophy.id, checkbox.checked);
    });
    checkCell.appendChild(checkbox);
    row.appendChild(checkCell);

    const nameCell = document.createElement("td");
    nameCell.className = "name";
    if (isSpoiled(trophy, progress)) {
      nameCell.innerHTML = `<span class="spoiled">Hidden story trophy</span><span class="desc">Hidden until earned — spoiler-safe is on.</span>`;
    } else {
      nameCell.textContent = trophy.name;
      const desc = document.createElement("span");
      desc.className = "desc";
      desc.textContent = trophy.description;
      nameCell.appendChild(desc);
      if (trophy.missable) {
        const flag = document.createElement("span");
        flag.className = "flag";
        flag.textContent = "MISSABLE";
        nameCell.appendChild(flag);
      }
      if (trophy.target) {
        const flag = document.createElement("span");
        flag.className = "flag target";
        flag.textContent = `Target: ${formatTarget(trophy.target)}`;
        nameCell.appendChild(flag);
      }
    }
    row.appendChild(nameCell);

    const gradeCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `grade ${trophy.grade}`;
    badge.textContent = trophy.grade;
    gradeCell.appendChild(badge);
    row.appendChild(gradeCell);

    const descCell = document.createElement("td");
    descCell.textContent = isSpoiled(trophy, progress) ? "—" : trophy.description;
    row.appendChild(descCell);

    row.addEventListener("click", () => onSelect(trophy.id));
    els.rows.appendChild(row);
  }
  els.emptyState.hidden = shown.length > 0;
  if (state.kind === "online") {
    els.emptyState.hidden = false;
    els.emptyState.textContent = "No online trophies: all 55 GTA VI trophies are offline single-player (PowerPyx). Nothing to track here.";
  } else if (shown.length === 0) {
    els.emptyState.textContent = "No trophies match these filters. Clear the search or pick another kind.";
  }
  els.listHint.textContent = state.kind === "online"
    ? "Online filter: 0 trophies."
    : `Showing ${shown.length} of ${trophies.length} trophies. Click a row to read its cited guide.`;
}

export function renderDetail(trophy, progress, els) {
  if (!trophy) {
    els.detail.innerHTML = `<p class="detail-empty">Select a trophy to read its guide and sources.</p>`;
    return;
  }
  const box = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = isSpoiled(trophy, progress) ? "Hidden story trophy" : trophy.name;
  box.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "meta";
  const badge = document.createElement("span");
  badge.className = `grade ${trophy.grade}`;
  badge.textContent = trophy.grade;
  meta.appendChild(badge);
  if (trophy.missable) {
    const flag = document.createElement("span");
    flag.className = "flag";
    flag.textContent = "MISSABLE — do it before leaving Chapter 1";
    meta.appendChild(flag);
  }
  if (trophy.target) {
    const flag = document.createElement("span");
    flag.className = "flag target";
    flag.textContent = `Target: ${formatTarget(trophy.target)}`;
    meta.appendChild(flag);
  }
  box.appendChild(meta);

  const official = document.createElement("p");
  official.className = "official";
  official.textContent = isSpoiled(trophy, progress)
    ? "Official description hidden until this trophy is earned."
    : `Official description: “${trophy.description}”`;
  box.appendChild(official);

  if (!isSpoiled(trophy, progress)) {
    const guideHead = document.createElement("h3");
    guideHead.textContent = "Guide";
    box.appendChild(guideHead);
    const guide = document.createElement("p");
    guide.className = "guide";
    guide.textContent = trophy.guide;
    box.appendChild(guide);

    const srcHead = document.createElement("h3");
    srcHead.textContent = "Sources";
    box.appendChild(srcHead);
    const list = document.createElement("ul");
    list.className = "sources";
    for (const source of trophy.sources || []) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = source.name;
      item.appendChild(link);
      list.appendChild(item);
    }
    box.appendChild(list);
  }

  const earnLine = document.createElement("div");
  earnLine.className = "earnline";
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(progress.earned[trophy.id]);
  checkbox.addEventListener("change", () => {
    document.querySelector(`tr[data-id="${trophy.id}"] input.earn`)?.click();
  });
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(" I earned this trophy"));
  earnLine.appendChild(label);
  box.appendChild(earnLine);

  els.detail.innerHTML = "";
  els.detail.appendChild(box);
}

export function renderRoadmap(trophies, els) {
  els.roadmapStages.innerHTML = "";
  for (const stage of ROADMAP_STAGES) {
    const item = document.createElement("li");
    const head = document.createElement("h3");
    head.textContent = `Step ${stage.n}: ${stage.title}`;
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = stage.when;
    head.appendChild(when);
    item.appendChild(head);
    const text = document.createElement("p");
    text.textContent = stage.text;
    item.appendChild(text);
    const list = document.createElement("p");
    list.className = "trophies";
    list.textContent = stage.trophies
      .map((id) => trophies.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(" · ");
    item.appendChild(list);
    els.roadmapStages.appendChild(item);
  }
  els.checklistRows.innerHTML = "";
  for (const [what, needed] of CHECKLIST_100) {
    const row = document.createElement("tr");
    const a = document.createElement("td");
    a.textContent = what;
    const b = document.createElement("td");
    b.textContent = needed;
    row.appendChild(a);
    row.appendChild(b);
    els.checklistRows.appendChild(row);
  }
}

export function renderMissables(trophies, progress, els) {
  const missable = trophies.filter((t) => t.missable);
  els.missableList.innerHTML = "";
  for (const trophy of missable) {
    const card = document.createElement("div");
    card.className = "missable-card";
    const head = document.createElement("h3");
    head.textContent = `${trophy.name} — ${trophy.grade}`;
    card.appendChild(head);
    const desc = document.createElement("p");
    desc.textContent = `Official: “${trophy.description}”`;
    card.appendChild(desc);
    const guide = document.createElement("p");
    guide.textContent = trophy.guide;
    card.appendChild(guide);
    const earned = document.createElement("p");
    earned.innerHTML = progress.earned[trophy.id]
      ? "<b>Done — you earned this one.</b>"
      : "<b>Not earned yet.</b> Tick it off in the Tracker once the balcony meditation is done.";
    card.appendChild(earned);
    els.missableList.appendChild(card);
  }
}

export function formatTarget(target) {
  return target >= 1000 ? `$${target.toLocaleString("en-US")}` : String(target);
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
