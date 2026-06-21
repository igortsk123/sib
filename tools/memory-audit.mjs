#!/usr/bin/env node
// memory-audit — детерминированная проверка консистентности Memory Bank.
// Без внешних зависимостей (Node >= 16, ESM).
//
// Делает:
//   1. Регенерирует блок GENERATED:decision-tree в INDEX.md из frontmatter всех Tier 1 доков.
//   2. Репортит orphan: memory-док без frontmatter `topic` (он невидим в навигации).
//   3. Репортит stale: Tier 1 сводка, чей tier2-документ новее (Tier2.updated > Tier1.updated).
//   4. Репортит broken: указатели tier1/tier2 и [[ссылки]], которые не резолвятся.
//
// Использование:
//   node tools/memory-audit.mjs [projectRoot]   (default: cwd)
//   node tools/memory-audit.mjs --check [root]   (не писать INDEX, только проверка; для CI/hook)
//
// Exit code: 0 — чисто; 1 — найдены проблемы; 2 — ошибка запуска (нет .memory_bank).

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, basename, sep } from "node:path";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const root = resolve(args.find((a) => !a.startsWith("--")) ?? process.cwd());
const mbDir = join(root, ".memory_bank");

if (!existsSync(mbDir)) {
  console.error(`[memory-audit] не найдено .memory_bank в ${root}`);
  process.exit(2);
}

const SKIP_DIRS = new Set(["_intake", "completed_plans", "archive", "changelog", "_secrets"]);
const SKIP_FILES = new Set([
  "README.md",
  "_template.md",
  "INDEX.md",
  // bank-infrastructure docs (policy/schema), not project memory — like README
  "METADATA_SCHEMA.md",
  "CLEANUP_POLICY.md",
]);
// always-on мета-доки: у них своя секция в INDEX, в авто-таблицу decision tree не дублируем
const ALWAYS_ON_TOPICS = new Set(["source-of-truth", "project-state", "decisions"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      out.push(...walk(full));
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);
const readDoc = (f) => stripBom(readFileSync(f, "utf8"));

// Минимальный парсер frontmatter (key: value между --- ---). Значения — строки.
function parseFrontmatter(text) {
  text = stripBom(text);
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const block = text.slice(3, end);
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return fm;
}

const isPlaceholder = (v) => !v || /\{\{.*\}\}/.test(v) || /^<.*>$/.test(v.trim()) || v === "";
// scaffold-файлы (шаблоны/реестры/планы/intake) — не настоящие memory-доки, из проверок исключаем
const isScaffold = (d) =>
  SKIP_FILES.has(basename(d.file)) ||
  d.rel.startsWith("plans/") ||
  d.rel.startsWith("_intake/");
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

// Собрать все доки
const files = walk(mbDir);
const docs = files.map((f) => {
  const text = readDoc(f);
  return { file: f, rel: relative(mbDir, f).split(sep).join("/"), fm: parseFrontmatter(text) };
});

const problems = [];
const byName = new Map(); // basename(no ext) -> doc
const byTopic = new Map(); // topic -> doc
for (const d of docs) {
  byName.set(basename(d.file, ".md"), d);
  if (d.fm.topic) byTopic.set(d.fm.topic, d);
}

// 1) Orphan — content-док без topic
for (const d of docs) {
  if (isScaffold(d)) continue;
  if (!d.fm.topic) {
    problems.push(`ORPHAN  ${d.rel} — нет frontmatter 'topic' (невидим в decision tree)`);
  }
}

// 2) Stale — Tier1 старше своего Tier2
function resolvePointer(d, ptr) {
  if (isPlaceholder(ptr)) return null;
  // pointers (tier1/tier2) трактуем как относительные к корню .memory_bank;
  // fallback — относительно папки самого дока (обратная совместимость).
  for (const p of [resolve(mbDir, ptr), resolve(dirname(d.file), ptr)]) {
    if (existsSync(p)) return p;
  }
  return { missing: resolve(mbDir, ptr) };
}
for (const d of docs) {
  if (isScaffold(d)) continue;
  const t2 = d.fm.tier2;
  if (isPlaceholder(t2)) continue;
  const target = resolvePointer(d, t2);
  if (target && target.missing) {
    problems.push(`BROKEN  ${d.rel} — tier2 указывает на несуществующий '${t2}'`);
    continue;
  }
  if (typeof target === "string") {
    const tdoc = docs.find((x) => x.file === target);
    if (tdoc && isDate(d.fm.updated) && isDate(tdoc.fm.updated) && tdoc.fm.updated > d.fm.updated) {
      problems.push(
        `STALE   ${d.rel} (updated ${d.fm.updated}) старше Tier2 ${tdoc.rel} (updated ${tdoc.fm.updated}) — сверь сводку`
      );
    }
  }
}

// 3) Broken — tier1 указатель и [[ссылки]]
for (const d of docs) {
  if (isScaffold(d)) continue;
  const t1 = d.fm.tier1;
  if (!isPlaceholder(t1)) {
    const target = resolvePointer(d, t1);
    if (target && target.missing) {
      problems.push(`BROKEN  ${d.rel} — tier1 указывает на несуществующий '${t1}'`);
    }
  }
  const text = readDoc(d.file);
  const body = text
    .replace(/^---[\s\S]*?\n---/, "") // frontmatter
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]*`/g, ""); // inline code (literal [[name]] examples живут тут)
  for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const name = m[1].trim();
    if (!byName.has(name) && !byTopic.has(name)) {
      problems.push(`BROKEN  ${d.rel} — [[${name}]] не резолвится (нет файла/topic)`);
    }
  }
}

// 4) Регенерация decision tree в INDEX.md
const indexPath = join(mbDir, "INDEX.md");
let regenNote = "";
if (existsSync(indexPath)) {
  const idx = readDoc(indexPath);
  const START = "<!-- GENERATED:decision-tree START -->";
  const END = "<!-- GENERATED:decision-tree END -->";
  const s = idx.indexOf(START);
  const e = idx.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) {
    const tier1 = docs
      .filter(
        (d) =>
          String(d.fm.tier) === "1" &&
          d.fm.topic &&
          !SKIP_FILES.has(basename(d.file)) &&
          !ALWAYS_ON_TOPICS.has(d.fm.topic)
      )
      .sort((a, b) => (a.fm.importance === "high" ? -1 : 1) - (b.fm.importance === "high" ? -1 : 1));
    const rows = tier1.map((d) => {
      const task = d.fm.scope || d.fm.topic;
      const t1 = d.rel;
      const t2 = isPlaceholder(d.fm.tier2) ? "—" : d.fm.tier2;
      return `| ${task} | \`${t1}\` | ${t2 === "—" ? "—" : "`" + t2 + "`"} |`;
    });
    const table = [
      "",
      "| Задача (scope) | Tier 1 | Tier 2 |",
      "|----------------|--------|--------|",
      ...(rows.length ? rows : ["| _(нет Tier 1 доков с topic)_ | — | — |"]),
      "",
    ].join("\n");
    const head = idx.slice(0, s + START.length);
    const tailMarker =
      "\n<!-- Таблицу регенерирует tools/memory-audit.mjs из frontmatter. Не редактируй вручную. -->\n";
    const rebuilt = head + tailMarker + table + idx.slice(e);
    if (!checkOnly) {
      if (rebuilt !== idx) {
        writeFileSync(indexPath, rebuilt, "utf8");
        regenNote = `decision tree регенерирован (${tier1.length} строк)`;
      } else {
        regenNote = "decision tree уже актуален";
      }
    } else {
      regenNote = "decision tree (--check: не переписан)";
    }
  } else {
    problems.push("BROKEN  INDEX.md — нет маркеров GENERATED:decision-tree START/END");
  }
}

// Отчёт
console.log(`[memory-audit] root=${root}`);
console.log(`[memory-audit] доков: ${docs.length}; ${regenNote}`);
if (problems.length === 0) {
  console.log("[memory-audit] ✓ проблем не найдено");
  process.exit(0);
}
console.log(`[memory-audit] ✗ найдено проблем: ${problems.length}`);
for (const p of problems) console.log("  - " + p);
process.exit(1);
