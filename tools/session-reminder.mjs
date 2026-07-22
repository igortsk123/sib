#!/usr/bin/env node
// session-reminder — Stop-hook: напоминает запустить /memory-check, если в сессии была
// содержательная работа. Эвристика намеренно грубая (лучше лишний раз напомнить):
// есть незакоммиченные изменения ВНЕ .memory_bank/ → значит, работа была, а захват — возможно, нет.
// Дополнительно: если код менялся, а блокнот _intake/session-scratch.md пуст — нудж сильнее
// (захват на ходу пропущен). Не git-репо / git недоступен → молчим (exit 0). Подключение —
// пресеты settings-presets/* (hooks.Stop) или tools/stop-hook.example.json.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
let changed = [];
try {
  const out = execFileSync("git", ["-C", root, "status", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  changed = out
    .split("\n")
    .filter(Boolean)
    .filter((l) => !l.slice(3).startsWith(".memory_bank/"));
} catch {
  process.exit(0);
}

// Блокнот захвата на ходу пуст? (нет строк после метки SCRATCH START)
function scratchEmpty() {
  const f = join(root, ".memory_bank", "_intake", "session-scratch.md");
  if (!existsSync(f)) return true;
  try {
    const txt = readFileSync(f, "utf8");
    const i = txt.indexOf("SCRATCH START");
    const tail = i === -1 ? txt : txt.slice(txt.indexOf("\n", i) + 1);
    return tail.replace(/<!--[\s\S]*?-->/g, "").trim().length === 0;
  } catch {
    return true;
  }
}

if (changed.length) {
  console.log(`⚠ Похоже, в сессии была содержательная работа (изменено файлов вне .memory_bank/: ${changed.length}).`);
  if (scratchEmpty()) {
    console.log("  Блокнот _intake/session-scratch.md ПУСТ — захват на ходу пропущен.");
    console.log("  Запусти /memory-check (разнесёт решения по .memory_bank/) — иначе факты сессии потеряются.");
  } else {
    console.log("  Перед /clear запусти /memory-check — консолидировать блокнот и захват сессии в .memory_bank/.");
  }
}
