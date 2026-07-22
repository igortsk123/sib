#!/usr/bin/env node
// session-freshness — SessionStart-hook: одна строка о свежести памяти в начале сессии.
// Молчит, когда память свежая и audit чист (тишина = норма, баннер = сигнал).
// Сигналы: project-state старше 14 дней; проблемы аудита (счётчик по категориям).
// Подключение — пресеты settings-presets/* (hooks.SessionStart).
import { resolve } from "node:path";
import { runChecks } from "./memory-audit.mjs";

const root = resolve(process.argv[2] ?? process.cwd());
const res = runChecks(root, { write: false });
if (res.fatal) process.exit(0); // нет .memory_bank — проект без банка, молчим

const parts = [];
if (res.psAgeDays !== null && res.psAgeDays > 14)
  parts.push(`project-state обновлён ${res.psAgeDays}д назад (${res.psUpdated}) — не доверяй снимку молча`);
if (!res.ok) {
  const counts = {};
  for (const p of res.problems) {
    const cat = p.split(/\s+/)[0];
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const top = Object.entries(counts)
    .map(([c, n]) => (n > 1 ? `${c}×${n}` : c))
    .join(", ");
  parts.push(`audit: ${res.problems.length} пробл. (${top})`);
}
if (parts.length) console.log(`🧠 memory: ${parts.join("; ")} → начни с /memory-check`);
