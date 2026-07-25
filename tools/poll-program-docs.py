#!/usr/bin/env python3
"""Недельная проверка документов условий страховых (боевая копия: /opt/sib-intake/poll_program_docs.py).

Требование владельца: «раз в неделю проверяем; файл тот же — фиксируем в истории; файл новый —
фиксируем и помечаем, что обновлён». Каждая проверка пишется в journal `document_check`:
    unchanged — контрольная сумма совпала (ничего не качаем повторно, только фиксируем факт);
    updated   — источник изменился: рядом сохраняется НОВЫЙ файл, создаётся НОВАЯ версия
                документа, старая помечается superseded_by_id (версии не удаляем никогда —
                полис живёт по редакции на дату заключения);
    failed    — источник недоступен/ошибка;
    skipped   — проверять нечего (нет ни ссылки на файл, ни адреса страницы).

Проверяются оба вида источников:
  • PDF и прочие файлы — по прямой ссылке file_url;
  • веб-страницы (у них file_url нет) — по source_url: скачиваем HTML, вырезаем текст и
    сравниваем контрольную сумму ТЕКСТА, иначе меняющиеся баннеры давали бы ложные обновления.

Запуск в цепочке sib-programs.service:
    poll_program_docs.py && extract_doc_texts.py && carry_coverage_rules.py
"""
import hashlib
import html
import os
import re
import subprocess
import sys
import urllib.request
from datetime import date

STORAGE = "/opt/sib-storage"
UA = "Mozilla/5.0 (compatible; sib-docs-poller/1.0)"
TIMEOUT = 60


def q(sql: str) -> list[list[str]]:
    r = subprocess.run(
        ["docker", "exec", "-i", "sib-db", "psql", "-U", "sib", "-d", "sib", "-A", "-t", "-F", "\x1f"],
        input=sql, capture_output=True, text=True, check=False,
    )
    if r.returncode != 0:
        print(r.stderr.strip()[:300], file=sys.stderr)
        sys.exit(1)
    return [line.split("\x1f") for line in r.stdout.strip().split("\n") if line]


def esc(value: str | None) -> str:
    return "null" if value is None else "'" + value.replace("'", "''") + "'"


def log_check(doc_id: str, status: str, sha: str | None = None, http: int | None = None,
              size: int | None = None, message: str | None = None, new_id: str | None = None) -> None:
    q(f"""insert into document_check (document_id, status, sha256, http_status, size_bytes, message, new_document_id)
          values ('{doc_id}', '{status}', {esc(sha)}, {http or 'null'}, {size or 'null'},
                  {esc(message)}, {f"'{new_id}'" if new_id else 'null'})""")
    q(f"update program_document set last_checked_at = now() where id = '{doc_id}'")


def fetch(url: str) -> tuple[bytes, int]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.read(), resp.status


# Динамика страниц, которая меняется от запроса к запросу и не является изменением условий:
# «© Sat Jul 25 22:05:23 MSK 2026», «Обновлено 25.07.2026 в 12:45», таймстемпы и номера сборок.
VOLATILE = [
    re.compile(r"(?i)(mon|tue|wed|thu|fri|sat|sun)\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\w+\s+\d{4}"),
    re.compile(r"\d{2}[.:]\d{2}[.:]\d{2,4}(\s+в\s+\d{1,2}[:.]\d{2})?"),
    re.compile(r"(?i)обновлено[^.]{0,40}"),
    re.compile(r"\b\d{10,}\b"),  # эпохи, идентификаторы сессий
]


def page_text(raw: bytes) -> bytes:
    """Текст страницы без разметки и без меняющихся отметок времени: иначе поллер каждую неделю
    (и даже каждый прогон) считал бы страницу «обновившейся» из-за часов в подвале."""
    doc = raw.decode("utf-8", "ignore")
    doc = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", doc)
    doc = re.sub(r"(?s)<[^>]+>", " ", doc)
    doc = html.unescape(doc)
    for rx in VOLATILE:
        doc = rx.sub(" ", doc)
    return re.sub(r"\s+", " ", doc).strip().encode("utf-8")


def save_new_version(doc: dict, blob: bytes, sha: str, is_page: bool) -> str:
    stamp = date.today().isoformat()
    base = os.path.basename(doc["storage_path"] or f"programs/doc_{doc['id'][:8]}")
    stem, ext = os.path.splitext(base)
    stem = re.sub(r"_\d{4}-\d{2}-\d{2}$", "", stem)
    ext = ext or (".txt" if is_page else ".pdf")
    newname = f"{stem}_{stamp}_{sha[:8]}{ext}"  # хэш в имени: редакции одного дня не затирают друг друга
    with open(os.path.join(STORAGE, "programs", newname), "wb") as f:
        f.write(blob)

    title = re.sub(r"\s*\(ред\. \d{4}-\d{2}-\d{2}\)\s*$", "", doc["title"])
    rows = q(f"""
        insert into program_document (insurance_company_id, program_name, title, doc_kind, source_url,
            file_url, storage_path, sha256, file_date, downloaded_at, applies_to, effective_from,
            notes, last_checked_at)
        select insurance_company_id, program_name, {esc(f'{title} (ред. {stamp})')}, doc_kind, source_url,
            file_url, 'programs/{newname}', '{sha}', null, now(), applies_to, null,
            'автоматически: источник изменился {stamp}', now()
        from program_document where id = '{doc['id']}'
        returning id""")
    new_id = rows[0][0]
    q(f"update program_document set superseded_by_id = '{new_id}' where id = '{doc['id']}'")
    return new_id


def main() -> None:
    rows = q("""select id, coalesce(file_url,''), coalesce(storage_path,''), coalesce(sha256,''),
                       coalesce(source_url,''), title
                from program_document where superseded_by_id is null order by title""")
    stats = {"unchanged": 0, "updated": 0, "failed": 0, "skipped": 0}

    for doc_id, file_url, storage_path, sha_old, source_url, title in rows:
        doc = {"id": doc_id, "storage_path": storage_path, "title": title}
        is_page = not file_url
        url = file_url or source_url
        if not url:
            log_check(doc_id, "skipped", message="нет ни ссылки на файл, ни адреса страницы")
            stats["skipped"] += 1
            continue

        try:
            raw, http = fetch(url)
        except Exception as exc:  # источник недоступен — фиксируем и идём дальше
            log_check(doc_id, "failed", message=f"{type(exc).__name__}: {exc}"[:300])
            stats["failed"] += 1
            print(f"[FAILED] {title[:44]}: {exc}")
            continue

        blob = page_text(raw) if is_page else raw
        sha = hashlib.sha256(blob).hexdigest()

        if sha_old and sha == sha_old:
            log_check(doc_id, "unchanged", sha=sha, http=http, size=len(blob))
            stats["unchanged"] += 1
            continue

        if not sha_old:  # первая фиксация: не редакция, просто запоминаем сумму
            q(f"update program_document set sha256 = '{sha}' where id = '{doc_id}'")
            log_check(doc_id, "unchanged", sha=sha, http=http, size=len(blob),
                      message="первая фиксация контрольной суммы")
            stats["unchanged"] += 1
            continue

        new_id = save_new_version(doc, blob, sha, is_page)
        log_check(doc_id, "updated", sha=sha, http=http, size=len(blob),
                  message="источник изменился — создана новая редакция", new_id=new_id)
        stats["updated"] += 1
        print(f"[ОБНОВЛЁН] {title[:44]} → новая редакция {new_id[:8]}")

    print("проверка завершена:", ", ".join(f"{k}={v}" for k, v in stats.items()))


if __name__ == "__main__":
    main()
