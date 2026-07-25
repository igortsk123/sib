#!/usr/bin/env python3
"""Выгрузка текста документа в /tmp/doc_<pref>.txt на сервере: python3 dumpdoc.py <pref>"""
import subprocess, sys
p = sys.argv[1]
sql = f"select dt.content from document_text dt join program_document pd on pd.id=dt.document_id where pd.id::text like '{p}%' order by dt.page"
r = subprocess.run(["docker","exec","-i","sib-db","psql","-U","sib","-d","sib","-A","-t"], input=sql, capture_output=True, text=True)
open(f"/tmp/doc_{p}.txt","w",encoding="utf-8").write(r.stdout)
print(p, len(r.stdout), "байт")
