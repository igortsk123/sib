#!/usr/bin/env python3
"""Аудит источников покрытия: проверяет, что КАЖДЫЙ документ проведён по всему процессу.

Требование владельца: «при каждом добавлении нового файла проверять, что промпт написан,
ссылка сохранена и всё встроено в общий процесс обновления».

Проверяет по каждому активному документу:
  1. ссылка на источник (source_url) — куда смотреть обновление;
  2. прямая ссылка на файл (file_url) — иначе недельный поллер его не проверит;
  3. локальная копия (storage_path) и контрольная сумма (sha256);
  4. факт проверки поллером (last_checked_at + записи в document_check);
  5. извлечённый текст (document_text);
  6. правила (coverage_rule) и их плотность на страницу текста;
  7. правила «на сверке» после обновления редакции.

Запуск: python3 audit-sources.py   (боевая копия: /opt/sib-intake/audit_sources.py)
"""
import subprocess
import sys


def q(sql: str) -> list[list[str]]:
    r = subprocess.run(
        ["docker", "exec", "-i", "sib-db", "psql", "-U", "sib", "-d", "sib", "-A", "-t", "-F", "\x1f"],
        input=sql, capture_output=True, text=True, check=False,
    )
    if r.returncode != 0:
        print(r.stderr.strip()[:300], file=sys.stderr)
        sys.exit(1)
    return [line.split("\x1f") for line in r.stdout.strip().split("\n") if line]


def main() -> None:
    rows = q("""
        select coalesce(ic.name, '—'), pd.title,
          case when coalesce(pd.source_url,'') = '' then 'нет' else 'есть' end,
          case when pd.file_url is null then 'нет' else 'есть' end,
          case when pd.storage_path is null then 'нет' else 'есть' end,
          case when pd.sha256 is null then 'нет' else 'есть' end,
          coalesce((select count(*)::text from document_text dt where dt.document_id = pd.id), '0'),
          coalesce((select count(*)::text from coverage_rule cr where cr.document_id = pd.id), '0'),
          coalesce((select count(*)::text from document_check dc where dc.document_id = pd.id), '0'),
          coalesce((select count(*)::text from coverage_rule cr where cr.document_id = pd.id and cr.needs_review), '0')
        from program_document pd
        left join insurance_company ic on ic.id = pd.insurance_company_id
        where pd.superseded_by_id is null
        order by ic.name, pd.title
    """)

    problems: list[str] = []
    print(f"{'страховая':22} {'документ':46} ссылка файл копия sha стр правил пров сверка")
    print("─" * 118)
    for insurer, title, surl, furl, store, sha, pages, rules, checks, review in rows:
        pages_i, rules_i = int(pages), int(rules)
        print(f"{insurer[:22]:22} {title[:46]:46} {surl:6} {furl:4} {store:5} {sha:3} "
              f"{pages:>3} {rules:>6} {checks:>4} {review:>6}")
        if surl == "нет":
            problems.append(f"{title[:40]}: нет ссылки на источник — не узнаем об обновлении")
        if furl == "нет":
            problems.append(f"{title[:40]}: нет прямой ссылки на файл — поллер проверит только текст страницы")
        if sha == "нет":
            problems.append(f"{title[:40]}: нет контрольной суммы — поллер сочтёт файл изменившимся")
        if pages_i == 0:
            problems.append(f"{title[:40]}: не извлечён текст — экстракция правил невозможна")
        elif rules_i == 0:
            problems.append(f"{title[:40]}: текст есть ({pages_i} стр.), но НЕТ ПРАВИЛ — экстракция не проведена")
        elif pages_i >= 20 and rules_i < pages_i / 8:
            problems.append(f"{title[:40]}: {rules_i} правил на {pages_i} страниц — похоже на заглушку, "
                            f"нужна полноценная экстракция по guides/coverage-extraction-prompt.md")
        if int(checks) == 0:
            problems.append(f"{title[:40]}: ни разу не проверялся поллером")
        if int(review) > 0:
            problems.append(f"{title[:40]}: {review} правил ждут сверки после обновления редакции")

    print()
    if problems:
        print(f"ПРОБЛЕМЫ ({len(problems)}):")
        for p in problems:
            print(" •", p)
    else:
        print("Все источники проведены по процессу полностью.")


if __name__ == "__main__":
    main()
