#!/usr/bin/env python3
"""Верификатор экстракции coverage_rule (см. .memory_bank/guides/coverage-extraction-prompt.md).
Запуск: python3 verify_rules.py <docId-prefix>"""
import re, subprocess, sys

def q(sql):
    r = subprocess.run(["docker", "exec", "-i", "sib-db", "psql", "-U", "sib", "-d", "sib", "-A", "-t", "-F", "|"],
                       input=sql, capture_output=True, text=True)
    return [l for l in r.stdout.strip().split("\n") if l]

pref = sys.argv[1]
scope = open(sys.argv[2], encoding="utf-8").read() if len(sys.argv) > 2 else None
doc = "\n".join(q(f"select content from document_text dt join program_document pd on pd.id=dt.document_id "
                  f"where pd.id::text like '{pref}%' order by dt.page"))
rules = [l.split("|") for l in q("select coalesce(clause,''), verdict, coalesce(condition_text,''), coalesce(service_pattern,'') "
                                 f"from coverage_rule cr join program_document pd on pd.id=cr.document_id where pd.id::text like '{pref}%'")]
if scope: doc = scope
norm = re.sub(r"\s+", " ", doc)
print(f"правил: {len(rules)}   символов текста: {len(doc)}" + ("  [scope-файл]" if scope else ""))
if not rules:
    print("ПУСТО — экстракция не выполнялась"); sys.exit(1)

# 1) полнота: листовые пункты документа
declared = {m.group(1) for m in re.finditer(r'(?m)^\s*(\d+\.\d+(?:\.\d+)*)\.?[\s]', doc)}
declared = {c for c in declared if not re.fullmatch(r'0?\d{1,2}\.0?\d{1,2}\.(19|20)\d\d', c) and int(c.split('.')[0]) < 30}
leaves = sorted({c for c in declared if not any(o != c and o.startswith(c + ".") for o in declared)},
                key=lambda s: [int(x) for x in s.split(".")])
have = set()
for cl, *_ in rules:
    have |= set(re.findall(r'\d+\.\d+(?:\.\d+)*', cl))
    for a, b in re.findall(r'(\d+\.\d+(?:\.\d+)*)\s*[–-]\s*(\d+\.\d+(?:\.\d+)*)', cl):
        pa, pb = [int(x) for x in a.split(".")], [int(x) for x in b.split(".")]
        if len(pa) == len(pb) and pa[:-1] == pb[:-1]:
            have |= {".".join(map(str, pa[:-1] + [i])) for i in range(pa[-1], pb[-1] + 1)}
missing = [c for c in leaves if c not in have]
pct = 100 * (len(leaves) - len(missing)) // max(len(leaves), 1)
print(f"1) ЛИСТОВЫЕ ПУНКТЫ: {len(leaves)-len(missing)}/{len(leaves)} ({pct}%)")
if missing:
    print("   не покрыты:", ", ".join(missing[:40]) + (" …" if len(missing) > 40 else ""))

# 2) якоря clause в тексте: числовой пункт ИЛИ фраза в «кавычках» должны находиться дословно
low = norm.lower()
bad = []
for cl, *_ in rules:
    num = re.search(r"\d+\.\d+(?:\.\d+)*", cl)
    if num:
        if num.group(0) not in norm:
            bad.append(cl)
    else:
        ph = re.search(r"[«\"]([^»\"]{6,})[»\"]", cl)
        if not ph or re.sub(r"\s+", " ", ph.group(1)).lower() not in low:
            bad.append(cl)
print(f"2) ЯКОРЯ clause НЕ НАЙДЕНЫ В ТЕКСТЕ: {len(bad)}" + (f" → {bad[:5]}" if bad else ""))

# 3) целостность
noc = sum(1 for cl, *_ in rules if not cl.strip())
condno = sum(1 for cl, v, ct, _ in rules if v == "conditional" and not ct.strip())
badv = sum(1 for cl, v, *_ in rules if v not in ("covered", "excluded", "needs_approval", "conditional"))
print(f"3) ЦЕЛОСТНОСТЬ: без clause={noc}, conditional без условия={condno}, чужой verdict={badv}")

# 4) эталонные услуги
for kw in ["удален", "имплант", "протезир", "ортодонт", "кариес", "пародонт", "коронк"]:
    n = sum(1 for _, _, ct, sp in rules if kw in sp.lower() or kw in ct.lower())
    doc_n = low.count(kw)
    flag = "  ⚠ есть в тексте, нет в правилах" if n == 0 and doc_n > 0 else ""
    print(f"4) «{kw}»: правил={n}, упоминаний в тексте={doc_n}{flag}")
