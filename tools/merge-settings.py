#!/usr/bin/env python3
# merge-settings — единственная реализация merge пресета прав в существующий settings JSON (для apply.sh).
# Parity: tools/merge-settings.ps1 обязан давать тот же результат; контракт — tests/merge-cases/*.json.
# Меняешь логику здесь — поменяй в ps1-паре и добавь кейс в merge-cases.
#
# Контракт:
#   - permissions.defaultMode берётся из пресета;
#   - permissions.allow/ask/deny — объединение существующего и пресета без дублей
#     (порядок: сначала существующие, затем новые из пресета);
#   - hooks: если в existing нет своего блока hooks — переносится из пресета целиком;
#     свои hooks пользователя не трогаются (глубокого merge нет);
#   - остальные ключи existing не трогаются;
#   - если результат не отличается от existing — печатается __NOCHANGE__.
#
# Usage: merge-settings.py <preset.json> <existing.json>   (результат — в stdout)
import json
import sys


def uniq(seq):
    seen = set()
    out = []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def merge(existing, preset):
    merged = json.loads(json.dumps(existing))
    perm = merged.setdefault("permissions", {})
    pp = preset.get("permissions", {})
    if "defaultMode" in pp:
        perm["defaultMode"] = pp["defaultMode"]
    for k in ("allow", "ask", "deny"):
        perm[k] = uniq(list(perm.get(k, []) or []) + list(pp.get(k, []) or []))
    if "hooks" in preset and "hooks" not in merged:
        merged["hooks"] = preset["hooks"]
    return merged


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: merge-settings.py <preset.json> <existing.json>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], encoding="utf-8") as f:
        preset = json.load(f)
    with open(sys.argv[2], encoding="utf-8") as f:
        existing = json.load(f)
    merged = merge(existing, preset)
    if json.dumps(existing, sort_keys=True) == json.dumps(merged, sort_keys=True):
        print("__NOCHANGE__")
    else:
        print(json.dumps(merged, indent=2, ensure_ascii=False))
