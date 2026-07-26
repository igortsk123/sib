#!/usr/bin/env python3
"""Создание целей Метрики для лендинга DocON (/land) — по образцу health-card
(цели создаются Management API тем же OAuth-токеном, что и Директ; создание СЧЁТЧИКА
токену недоступно — счётчик заводит владелец в UI, затем: python3 tools/metrika-goals.py <counter_id>).

Цели (соответствуют trackGoal-вызовам в коде):
  lead         — JS: клик по любому контакту (ГЛАВНАЯ; на ней — оплата за конверсии в Директе)
  contact_tg / contact_wa / contact_max — JS: детализация канала
  Открыто демо — URL: /demo
После создания: NEXT_PUBLIC_METRIKA_ID=<id> в /opt/sib.env + пересборка (деплой), затем
привязать счётчик к кампаниям: campaigns.update TextCampaign.CounterIds.Items=[<id>].
Токен: env YANDEX_DIRECT_TOKEN (или из .memory_bank/_secrets/ACCESS.md)."""
import json
import os
import sys
import urllib.request

COUNTER = sys.argv[1] if len(sys.argv) > 1 else ""
if not COUNTER.isdigit():
    print("использование: python3 tools/metrika-goals.py <counter_id>")
    sys.exit(1)
TOKEN = os.environ.get("YANDEX_DIRECT_TOKEN", "")
if not TOKEN:
    for line in open(".memory_bank/_secrets/ACCESS.md", encoding="utf-8"):
        if line.strip().startswith("- Access token:"):
            TOKEN = line.split(":", 1)[1].strip()
            break
GOALS = [
    {"name": "Заявка (lead) — клик по контакту", "type": "action", "conditions": [{"type": "exact", "url": "lead"}]},
    {"name": "Контакт: Telegram", "type": "action", "conditions": [{"type": "exact", "url": "contact_tg"}]},
    {"name": "Контакт: WhatsApp", "type": "action", "conditions": [{"type": "exact", "url": "contact_wa"}]},
    {"name": "Контакт: MAX", "type": "action", "conditions": [{"type": "exact", "url": "contact_max"}]},
    {"name": "Открыто демо", "type": "url", "conditions": [{"type": "contain", "url": "/demo"}]},
]
for g in GOALS:
    req = urllib.request.Request(
        f"https://api-metrika.yandex.net/management/v1/counter/{COUNTER}/goals",
        data=json.dumps({"goal": g}).encode(),
        headers={"Authorization": f"OAuth {TOKEN}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read())
        print(f"цель создана: {d['goal']['id']} — {g['name']}")
    except urllib.error.HTTPError as e:
        print(f"ОШИБКА «{g['name']}»: {e.read().decode()[:200]}")
