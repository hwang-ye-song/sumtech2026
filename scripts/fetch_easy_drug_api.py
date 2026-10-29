# 식약처 공공데이터 "의약품개요정보(e약은요)" OpenAPI로 전체 품목(약 4,700개)을 받아 data/drugs/에 저장한다.
# 공공데이터포털(data.go.kr)에서 활용신청 후 받은 일반 인증키(Decoding)를 환경변수 DATA_GO_KR_SERVICE_KEY에 넣고 실행한다.
#   python scripts/fetch_easy_drug_api.py
# 의약품안전나라 사이트는 robots.txt로 자동 수집을 막고 있으므로 전체 목록은 이 API로만 받는다.
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ENDPOINT = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "drugs"
FIELDS = {
    "itemSeq": "item_seq",
    "itemName": "item_name",
    "entpName": "company",
    "efcyQesitm": "efficacy",
    "useMethodQesitm": "usage",
    "atpnWarnQesitm": "warning",
    "atpnQesitm": "precautions",
    "intrcQesitm": "interactions",
    "seQesitm": "side_effects",
    "depositMethodQesitm": "storage",
    "openDe": "open_date",
    "updateDe": "update_date",
    "itemImage": "image_url",
}


def fetch_page(key, page, rows=100):
    params = urllib.parse.urlencode({"serviceKey": key, "pageNo": page, "numOfRows": rows, "type": "json"})
    with urllib.request.urlopen(f"{ENDPOINT}?{params}", timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    header = data.get("header", {})
    if header.get("resultCode") not in ("00", None):
        raise RuntimeError(f"API 오류: {header}")
    body = data["body"]
    return body.get("items") or [], int(body.get("totalCount", 0))


def clean(v):
    # 응답 본문에 <p> 같은 태그와 줄바꿈이 섞여 온다
    if v is None:
        return ""
    return " ".join(str(v).replace("<p>", " ").replace("</p>", " ").split())


def main():
    key = os.environ.get("DATA_GO_KR_SERVICE_KEY")
    if not key:
        sys.exit("DATA_GO_KR_SERVICE_KEY 환경변수가 없습니다. data.go.kr에서 받은 인증키(Decoding)를 넣어 주세요.")
    items, page, total = [], 1, None
    while total is None or len(items) < total:
        batch, total = fetch_page(key, page)
        if not batch:
            break
        items.extend({dst: clean(it.get(src)) for src, dst in FIELDS.items()} for it in batch)
        print(f"{len(items)}/{total}", flush=True)
        page += 1
        time.sleep(0.3)
    for it in items:
        it["source"] = "식품의약품안전처 의약품개요정보(e약은요) OpenAPI"
        it["source_url"] = f"https://nedrug.mfds.go.kr/searchEasyDrug/easyDetail?itemSeq={it['item_seq']}"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "easy_drug_all.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(OUT_DIR / "easy_drug_all.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(items[0].keys()))
        w.writeheader()
        w.writerows(items)
    print(f"저장 완료: {len(items)}개 → {OUT_DIR}")


if __name__ == "__main__":
    main()
