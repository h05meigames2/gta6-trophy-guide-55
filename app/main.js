// Boot: load the trophy data, wire the tracker, tabs and screenshot parameters.
// Screenshot parameters (used only to take the entry's screenshots):
//   ?tab=tracker|roadmap|missables  ?filter=<kind>  ?spoiler=1
//   ?seed=2,3,4  (comma-separated trophy ids marked earned for the shot)
//   ?open=28     (open a trophy's guide in the detail pane)
import { loadProgress, saveProgress, exportProgress, importProgressFile } from "./store.js";
import {
  renderProgress, renderChips, renderRows, renderDetail, renderRoadmap, renderMissables,
} from "./render.js";

const els = {
  earnedCount: document.getElementById("earnedCount"),
  progressFill: document.getElementById("progressFill"),
  gradeCounts: document.getElementById("gradeCounts"),
  nextUp: document.getElementById("nextUp"),
  kindChips: document.getElementById("kindChips"),
  rows: document.getElementById("rows"),
  emptyState: document.getElementById("emptyState"),
  listHint: document.getElementById("listHint"),
  detail: document.getElementById("detail"),
  roadmapStages: document.getElementById("roadmapStages"),
  checklistRows: document.getElementById("checklistRows"),
  missableList: document.getElementById("missableList"),
  search: document.getElementById("search"),
  gradeFilter: document.getElementById("gradeFilter"),
  spoilerToggle: document.getElementById("spoilerToggle"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
};

const progress = loadProgress();
const state = { kind: "all", grade: "all", search: "", selectedId: null, tab: "tracker" };
let trophies = [];

function renderAll() {
  renderProgress(trophies, progress, els);
  renderChips(state, els, (kind) => {
    state.kind = kind;
    renderAll();
  });
  renderRows(trophies, state, progress, els,
    (id) => {
      state.selectedId = id;
      renderAll();
    },
    (id, checked) => {
      progress.earned[id] = checked;
      if (!checked) delete progress.earned[id];
      saveProgress(progress);
      renderAll();
    });
  renderDetail(trophies.find((t) => t.id === state.selectedId) ?? null, progress, els);
  renderMissables(trophies, progress, els);
}

function switchTab(tab) {
  state.tab = tab;
  for (const button of document.querySelectorAll(".tabs button")) {
    button.classList.toggle("active", button.dataset.tab === tab);
  }
  for (const page of document.querySelectorAll(".tabpage")) {
    page.classList.toggle("active", page.id === `tab-${tab}`);
  }
}

async function boot() {
  const response = await fetch("data/trophies.json");
  const data = await response.json();
  trophies = data.trophies;
  renderRoadmap(trophies, els);

  els.search.addEventListener("input", () => {
    state.search = els.search.value;
    renderAll();
  });
  els.gradeFilter.addEventListener("change", () => {
    state.grade = els.gradeFilter.value;
    renderAll();
  });
  els.spoilerToggle.checked = progress.spoiler;
  els.spoilerToggle.addEventListener("change", () => {
    progress.spoiler = els.spoilerToggle.checked;
    saveProgress(progress);
    renderAll();
  });
  els.exportBtn.addEventListener("click", () => exportProgress(progress));
  els.importFile.addEventListener("change", async () => {
    const file = els.importFile.files?.[0];
    if (!file) return;
    const result = await importProgressFile(file);
    if (result.ok) {
      progress.earned = result.progress.earned;
      progress.spoiler = result.progress.spoiler;
      els.spoilerToggle.checked = progress.spoiler;
      saveProgress(progress);
      renderAll();
    } else {
      alert(result.error);
    }
    els.importFile.value = "";
  });
  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Clear all earned trophies?")) return;
    progress.earned = {};
    saveProgress(progress);
    renderAll();
  });
  for (const button of document.querySelectorAll(".tabs button")) {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  }

  // Screenshot parameters: deterministic states for the entry's screenshots.
  const params = new URLSearchParams(location.search);
  if (params.get("seed")) {
    for (const raw of params.get("seed").split(",")) {
      const id = Number(raw);
      if (Number.isInteger(id)) progress.earned[id] = true;
    }
    saveProgress(progress);
  }
  if (params.get("spoiler") === "1") {
    progress.spoiler = true;
    els.spoilerToggle.checked = true;
    saveProgress(progress);
  }
  if (params.get("filter")) state.kind = params.get("filter");
  if (params.get("open")) {
    const id = Number(params.get("open"));
    if (trophies.some((t) => t.id === id)) state.selectedId = id;
  }
  if (params.get("tab")) switchTab(params.get("tab"));
  renderAll();
}

boot();
