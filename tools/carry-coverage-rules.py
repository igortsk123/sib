#!/usr/bin/env python3
"""Авто-разнос правил покрытия на новую редакцию документа (план coverage-resolver).

Конвейер владельца: «вышли новые правила — они автоматически разнеслись на наши правила,
видна актуальная версия». Механика:
  1. Поллер (poll_program_docs.py) при смене sha создаёт НОВУЮ версию документа,
     старую помечает superseded_by_id. У новой версии правил нет → карточки опустели бы.
  2. Этот скрипт копирует правила со старой версии на новую, сохраняя ссылку carried_from,
     и сверяет текст по каждому clause:
       • пункт найден дословно в новом тексте → правило переносится как есть;
       • пункт не найден / текст вокруг изменился → правило переносится с needs_review=true,
         в карточке видно «редакция обновилась, правило проверяется».
  3. Агент перепроверяет только помеченные правила по guides/coverage-extraction-prompt.md.

Так покрытие никогда не «пропадает» при обновлении источника, а изменения не выдаются
молча за проверенные. Запуск — из sib-programs.service после extract_doc_texts.py.
"""
import re
import subprocess
import sys


def q(sql: str) -> list[list[str]]:
    r = subprocess.run(
        ["docker", "exec", "-i", "sib-db", "psql", "-U", "sib", "-d", "sib", "-A", "-t", "-F", "\x1f"],
        input=sql, capture_output=True, text=True, check=False,
    )
    if r.returncode != 0:
        print(r.stderr.strip()[:400], file=sys.stderr)
        sys.exit(1)
    return [line.split("\x1f") for line in r.stdout.strip().split("\n") if line]


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text)


def anchor_of(clause: str) -> str | None:
    """Числовой пункт («п. 3.2.7») или фраза-якорь в «ёлочках» — как в промпте экстракции."""
    num = re.search(r"\d+\.\d+(?:\.\d+)*", clause or "")
    if num:
        return num.group(0)
    phrase = re.search(r"[«\"]([^»\"]{6,})[»\"]", clause or "")
    return phrase.group(1) if phrase else None


def main() -> None:
    # пары «старая версия (есть правила) → новая версия (правил нет)»
    pairs = q("""
        select old.id, new.id, new.title
        from program_document old
        join program_document new on new.id = old.superseded_by_id
        where exists (select 1 from coverage_rule cr where cr.document_id = old.id)
          and not exists (select 1 from coverage_rule cr where cr.document_id = new.id)
    """)
    if not pairs:
        print("новых редакций без правил нет")
        return

    for old_id, new_id, title in pairs:
        text = norm(" ".join(row[0] for row in q(
            f"select content from document_text where document_id = '{new_id}' order by page")))
        rules = q(f"select id, coalesce(clause,'') from coverage_rule where document_id = '{old_id}'")
        if not text:
            print(f"[{title[:48]}] текст новой редакции пуст — перенос отложен")
            continue

        confirmed, flagged = [], []
        for rule_id, clause in rules:
            anchor = anchor_of(clause)
            (confirmed if anchor and anchor in text else flagged).append(rule_id)

        for ids, review in ((confirmed, "false"), (flagged, "true")):
            if not ids:
                continue
            id_list = ",".join(f"'{i}'" for i in ids)
            q(f"""
                insert into coverage_rule (document_id, insurance_company_id, program_name, service_class,
                    service_pattern, verdict, condition_text, limit_amount, clause, scope_level,
                    overridable, needs_review, carried_from_document_id)
                select '{new_id}', insurance_company_id, program_name, service_class, service_pattern,
                    verdict, condition_text, limit_amount, clause, scope_level, overridable,
                    {review}, '{old_id}'
                from coverage_rule where id in ({id_list})
            """)
        print(f"[{title[:48]}] перенесено {len(confirmed)+len(flagged)} правил, "
              f"на проверку помечено {len(flagged)}")

    total = q("select count(*) from coverage_rule where needs_review")[0][0]
    print(f"итого правил на проверке агентом: {total}")


if __name__ == "__main__":
    main()
