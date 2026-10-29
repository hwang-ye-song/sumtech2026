-- 건강기능식품 데이터 (Supabase public 스키마)
-- 원본: 건강기능식품_전체_1-46101.csv (46,101개 제품)
-- 결과: health_food 46,101행 / health_food_ingredient 1,219,707행 (고유 원재료명 9,253개)
--
-- 적재 순서
--   1) health_food_staging 생성 → Table Editor "Import data from CSV"로 원본 CSV 업로드
--      ※ 대시보드 CSV 임포터가 청크 경계에서 한글 글자를 깨뜨림(U+FFFD).
--        임포트 후 아래 확인 쿼리로 깨진 글자가 0인지 반드시 확인할 것.
--   2) 정규화 → health_food / health_food_ingredient 생성
--   3) 검증 후 staging 삭제

-- 1) staging: CSV 헤더와 동일한 컬럼명
create table public.health_food_staging (
  "번호" text, "목록_제품명" text, "목록_기능성" text, "제조사명" text, "제품명" text,
  "신고번호" text, "등록일자" text, "유통기한" text, "성상" text, "섭취량/섭취방법" text,
  "포장재질(방법)" text, "기능성 내용" text, "보존 및 유통기준" text, "섭취 시 주의사항" text,
  "기능성 원재료명" text, "기타 원재료명" text, "캡슐 원재료명" text
);
alter table public.health_food_staging enable row level security;

-- 깨진 글자 확인 (0이어야 함)
-- select count(*) from public.health_food_staging s, jsonb_each_text(to_jsonb(s)) e
-- where e.value like '%' || chr(65533) || '%';

-- 2) 제품 테이블
create table public.health_food (
  report_no          text primary key,          -- 신고번호
  list_no            integer,                   -- 번호
  name               text not null,             -- 제품명
  list_name          text,                      -- 목록_제품명
  company            text,                      -- 제조사명
  list_functionality text,                      -- 목록_기능성
  registered_at      date,                      -- 등록일자
  shelf_life         text,                      -- 유통기한
  appearance         text,                      -- 성상
  intake_method      text,                      -- 섭취량/섭취방법
  packaging          text,                      -- 포장재질(방법)
  functionality      text,                      -- 기능성 내용
  storage            text,                      -- 보존 및 유통기준
  precautions        text,                      -- 섭취 시 주의사항
  ingredient_count   integer
);

-- 원재료 테이블 (제품 1 : N 원재료). 원본의 'A | B | C'를 한 행씩 분리
create table public.health_food_ingredient (
  id              bigint generated always as identity primary key,
  report_no       text not null references public.health_food(report_no) on delete cascade,
  ingredient_type text not null check (ingredient_type in ('functional','other','capsule')),
                  -- functional=기능성 원재료명, other=기타 원재료명, capsule=캡슐 원재료명
  seq             integer not null,             -- 원본 목록 내 순서
  ingredient_name text not null
);

insert into public.health_food
  (report_no, list_no, name, list_name, company, list_functionality, registered_at, shelf_life,
   appearance, intake_method, packaging, functionality, storage, precautions)
select "신고번호", "번호"::int, trim("제품명"), trim("목록_제품명"), trim("제조사명"), "목록_기능성",
       "등록일자"::date, "유통기한", "성상", "섭취량/섭취방법", "포장재질(방법)", "기능성 내용",
       "보존 및 유통기준", "섭취 시 주의사항"
from public.health_food_staging;

insert into public.health_food_ingredient (report_no, ingredient_type, seq, ingredient_name)
select s."신고번호", v.t, x.ord::int, trim(x.tok)
from public.health_food_staging s
cross join lateral (values ('functional', s."기능성 원재료명"),
                           ('other',      s."기타 원재료명"),
                           ('capsule',    s."캡슐 원재료명")) v(t, raw)
cross join lateral unnest(string_to_array(v.raw, '|')) with ordinality x(tok, ord)
where v.raw is not null and trim(x.tok) <> ''
order by s."신고번호", v.t, x.ord;

update public.health_food h set ingredient_count = c.n
from (select report_no, count(*) n from public.health_food_ingredient group by report_no) c
where c.report_no = h.report_no;
update public.health_food set ingredient_count = 0 where ingredient_count is null;

create index health_food_ingredient_report_no_idx on public.health_food_ingredient(report_no);
create index health_food_ingredient_name_idx      on public.health_food_ingredient(ingredient_name);
create index health_food_name_idx                 on public.health_food(name);

alter table public.health_food enable row level security;
alter table public.health_food_ingredient enable row level security;

-- 3) 검증 후 staging 삭제
-- select (select count(*) from public.health_food), (select count(*) from public.health_food_ingredient);
drop table public.health_food_staging;
