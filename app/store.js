// Progress store: localStorage save, JSON export and import. No network, no cookies.
const KEY = "gta6-trophy-guide-progress-v1";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { earned: {}, spoiler: false };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { earned: {}, spoiler: false };
    return {
      earned: parsed.earned && typeof parsed.earned === "object" ? parsed.earned : {},
      spoiler: parsed.spoiler === true,
    };
  } catch {
    return { earned: {}, spoiler: false };
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable: progress stays in memory for this session.
  }
}

export function exportProgress(progress) {
  const blob = new Blob(
    [JSON.stringify({ app: "gta6-trophy-guide", version: 1, earned: progress.earned, spoiler: progress.spoiler }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gta6-trophy-progress.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Returns { ok: true, progress } or { ok: false, error }.
export async function importProgressFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const earned = parsed.earned ?? parsed;
    if (!earned || typeof earned !== "object" || Array.isArray(earned)) {
      return { ok: false, error: "File has no earned-trophy list." };
    }
    const clean = {};
    for (const [id, value] of Object.entries(earned)) {
      if (value === true) clean[String(Number(id))] = true;
    }
    return { ok: true, progress: { earned: clean, spoiler: parsed.spoiler === true } };
  } catch {
    return { ok: false, error: "Could not read that file as progress JSON." };
  }
}
