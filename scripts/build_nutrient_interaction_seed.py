# data/nutrient_interactions/interactions.json(비타민·미네랄 병용 위해 조합 + 출처)을 읽어 같은 폴더에 seed.sql을 만든다.
#   python scripts/build_nutrient_interaction_seed.py
# 네트워크를 쓰지 않는다. interactions.json을 고친 뒤 다시 실행하면 seed.sql이 새로 만들어진다.
import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "nutrient_interactions"
INTERACTION_COLS = [
    "id", "category", "nutrient", "nutrient_condition", "counterpart", "counterpart_class", "counterpart_type",
    "outcome_type", "harmful_effect", "causal_ingredient", "mechanism", "example_products", "example_scenario",
    "severity", "relation", "management", "evidence_level", "confidence", "notes",
]
SOURCE_COLS = ["id", "interaction_id", "kind", "title", "url", "pmid", "doi", "quote", "verified"]


def sql_value(v):
    if v is None or (isinstance(v, str) and not v.strip()):
        return "NULL"
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).strip().replace("'", "''") + "'"


def split_paper_id(source):
    text = f"{source.get('pmid_or_doi', '')} {source['url']}"
    pmid = re.search(r"PMID[:\s]*(\d{4,9})|pubmed\.ncbi\.nlm\.nih\.gov/(\d{4,9})|europepmc\.org/(?:article|abstract)/MED/(\d{4,9})", text, re.I)
    if not pmid and re.fullmatch(r"\d{4,9}", source.get("pmid_or_doi", "").strip()):
        pmid_value = source["pmid_or_doi"].strip()
    else:
        pmid_value = next((g for g in pmid.groups() if g), None) if pmid else None
    doi = re.search(r"10\.\d{4,9}/[^\s;,]+", text)
    return pmid_value, doi.group(0).rstrip(".") if doi else None


def insert(table, cols, values):
    return f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(sql_value(v) for v in values)});"


def main():
    rows = json.loads((DATA_DIR / "interactions.json").read_text(encoding="utf-8"))
    lines = [
        "-- data/nutrient_interactions/schema.sql 을 먼저 실행한 뒤 이 파일을 실행한다. "
        "scripts/build_nutrient_interaction_seed.py가 만든 파일이므로 손으로 고치지 않는다.",
        "BEGIN;",
    ]
    source_id = 0
    for r in rows:
        lines.append(insert("nutrient_interaction", INTERACTION_COLS, [r.get(c) for c in INTERACTION_COLS]))
    for r in rows:
        for s in r["sources"]:
            source_id += 1
            pmid, doi = split_paper_id(s) if s["kind"] == "논문" else (None, None)
            values = [source_id, r["id"], s["kind"], s["title"], s["url"], pmid, doi, s.get("quote"), s.get("verified", "skipped")]
            lines.append(insert("nutrient_interaction_source", SOURCE_COLS, values))
    lines.append("COMMIT;")
    (DATA_DIR / "seed.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"seed.sql: 조합 {len(rows)}개, 출처 {source_id}개")


if __name__ == "__main__":
    main()
