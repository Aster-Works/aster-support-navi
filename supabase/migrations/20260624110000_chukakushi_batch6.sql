-- 中核市第6バッチ（高知/那覇/川越/福山/豊橋 × 児童手当/子ども医療費/ひとり親医療費/生活困窮自立相談/身体障害者手帳）
-- 新規行のみ（既存DB行は不変）。冪等 upsert。研究→敵対検証WF 25/25 ok・全URL200・全.lg.jp公式。

-- prefectures(2) + municipalities(5)
insert into public.prefectures (slug, name, name_kana, region) values ('kochi', '高知県', 'こうちけん', '四国')
on conflict (slug) do update set name = excluded.name, name_kana = excluded.name_kana, region = excluded.region;
insert into public.prefectures (slug, name, name_kana, region) values ('okinawa', '沖縄県', 'おきなわけん', '沖縄')
on conflict (slug) do update set name = excluded.name, name_kana = excluded.name_kana, region = excluded.region;
insert into public.municipalities (prefecture_id, slug, name, name_kana, official_site_url, population, intro)
select p.id, 'kochi', '高知市', 'こうちし', 'https://www.city.kochi.kochi.jp/', NULL, '高知市に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。' from public.prefectures p where p.slug = 'kochi'
on conflict (prefecture_id, slug) do update set name = excluded.name, name_kana = excluded.name_kana, official_site_url = excluded.official_site_url, population = excluded.population, intro = excluded.intro;
insert into public.municipalities (prefecture_id, slug, name, name_kana, official_site_url, population, intro)
select p.id, 'naha', '那覇市', 'なはし', 'https://www.city.naha.okinawa.jp/', NULL, '那覇市に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。' from public.prefectures p where p.slug = 'okinawa'
on conflict (prefecture_id, slug) do update set name = excluded.name, name_kana = excluded.name_kana, official_site_url = excluded.official_site_url, population = excluded.population, intro = excluded.intro;
insert into public.municipalities (prefecture_id, slug, name, name_kana, official_site_url, population, intro)
select p.id, 'kawagoe', '川越市', 'かわごえし', 'https://www.city.kawagoe.saitama.jp/', NULL, '川越市に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。' from public.prefectures p where p.slug = 'saitama'
on conflict (prefecture_id, slug) do update set name = excluded.name, name_kana = excluded.name_kana, official_site_url = excluded.official_site_url, population = excluded.population, intro = excluded.intro;
insert into public.municipalities (prefecture_id, slug, name, name_kana, official_site_url, population, intro)
select p.id, 'fukuyama', '福山市', 'ふくやまし', 'https://www.city.fukuyama.hiroshima.jp/', NULL, '福山市に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。' from public.prefectures p where p.slug = 'hiroshima'
on conflict (prefecture_id, slug) do update set name = excluded.name, name_kana = excluded.name_kana, official_site_url = excluded.official_site_url, population = excluded.population, intro = excluded.intro;
insert into public.municipalities (prefecture_id, slug, name, name_kana, official_site_url, population, intro)
select p.id, 'toyohashi', '豊橋市', 'とよはしし', 'https://www.city.toyohashi.lg.jp/', NULL, '豊橋市に住む方・転入する方が確認したい、出産・子育て・医療・ひとり親などの支援制度を整理しています。' from public.prefectures p where p.slug = 'aichi'
on conflict (prefecture_id, slug) do update set name = excluded.name, name_kana = excluded.name_kana, official_site_url = excluded.official_site_url, population = excluded.population, intro = excluded.intro;

-- support_programs(25) + categories/life_events/sources/revisions
insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'kochi' and m.slug = 'kochi'), 'kochi-kochi-child-allowance', '児童手当', '高知市にお住まいで、高校生年代までの児童を養育している方が対象となる可能性がある、国の制度に基づく手当です。支給額・所得などの要件は公式ページでご確認ください。', '高知市に住んでいて、高校生くらいまでの子どもを育てている人がもらえる可能性があるお金の手当です。国の制度で、高知市の子育て給付課が窓口です。申請は市役所の窓口、郵送、インターネット（マイナポータル）でできます。いくらもらえるか、もらえる条件などは、高知市の公式ホームページで確認してください。', 'cash',
  '高知市に住民登録があり、高校生年代（18歳到達後最初の3月31日）までの児童を養育している方が対象となる可能性があります。詳しい支給要件・対象範囲は高知市の公式ページでご確認ください。', '支給額は児童の年齢や出生順位（第何子か）などにより異なります。具体的な金額は高知市の公式ページでご確認ください。', '出生や転入などの事由が生じた場合、原則として事由が生じた日の翌日から一定期間内（15日以内など）に申請が必要とされています。期限の詳細は公式ページでご確認ください。', NULL,
  '高知市役所こども未来部子育て給付課（本庁舎3階）または各地域窓口センターでの窓口申請のほか、郵送、オンライン（マイナポータルの子育てワンストップサービス／ぴったりサービス）での申請が案内されています。', '初めて申請する際は、申請者の本人確認書類、個人番号（マイナンバー）確認書類、振込先口座が分かるものなどが必要とされる場合があります。状況により追加書類が必要になることがあるため、詳しくは公式ページや窓口でご確認ください。', TRUE,
  '高知市 こども未来部 子育て給付課', '088-823-9447', NULL, 'https://www.city.kochi.kochi.jp/soshiki/33/jidou-teate2013.html', '児童手当 - 高知市ホームページ（子育て給付課）',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'requiredDocumentsText', 'applicationDeadlineText', '所得制限の有無', '支給対象の詳細要件']::text[], '本ページは高知市の公式情報をもとにした概要です。支給額・所得・対象範囲・申請期限などの最新かつ正確な内容は、必ず高知市の公式ページまたは子育て給付課でご確認ください。受給の可否は審査によります。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-child-allowance');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'kochi-kochi-child-allowance' and c.slug = 'childcare' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-child-allowance');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'kochi-kochi-child-allowance' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'kochi-kochi-child-allowance'
), updated_source as (
  update public.support_sources src
  set
    title = '児童手当 - 高知市ホームページ（子育て給付課）',
    publisher = coalesce(src.publisher, 'www.city.kochi.kochi.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '1a98cccfb038b63873fafde5b2d411d862d486eefb92ef8542f409c895b8352d',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kochi.kochi.jp/soshiki/33/jidou-teate2013.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kochi.kochi.jp/soshiki/33/jidou-teate2013.html', '児童手当 - 高知市ホームページ（子育て給付課）', 'www.city.kochi.kochi.jp',
  now(), '2026-06-24', '1a98cccfb038b63873fafde5b2d411d862d486eefb92ef8542f409c895b8352d', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"kochi-kochi-child-allowance","status":"published","title":"児童手当","officialUrl":"https://www.city.kochi.kochi.jp/soshiki/33/jidou-teate2013.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"1a98cccfb038b63873fafde5b2d411d862d486eefb92ef8542f409c895b8352d"}'::jsonb,
  'seed:kochi-kochi-child-allowance:1a98cccfb038b63873fafde5b2d411d862d486eefb92ef8542f409c895b8352d'
from public.support_programs sp
where sp.slug = 'kochi-kochi-child-allowance'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'okinawa' and m.slug = 'naha'), 'okinawa-naha-child-allowance', '児童手当（那覇市）', '那覇市が窓口となる、子どもを養育している方に支給される国の児童手当制度です。令和6年10月分以降、支給対象が高校生年代まで拡大され、所得制限が撤廃されたとされていますが、最新の対象・金額は公式でご確認ください。', '子どもを育てている家庭に、国からお金（児童手当）が支給される制度です。那覇市が手続きの窓口になります。生まれたときや那覇市に引っ越してきたときなどは、申請が必要な場合があります。もらえる金額や対象は子どもの年齢・人数で変わるので、くわしくは那覇市の公式ページで確認してください。', 'cash',
  '那覇市内に住所があり、対象年齢（おおむね高校生年代まで／18歳に達する日以後の最初の3月31日まで）の児童を養育している父母等が対象となる可能性があります。対象児童の年齢区分や養育人数により取り扱いが異なるため、ご自身が対象かどうかは公式でご確認ください。', '支給額は対象児童の年齢（0～3歳、3歳～高校生年代）や養育する子の人数（第1・2子、第3子以降）により区分があるとされています。具体的な月額・加算額は変更される場合があるため、公式ページで最新の金額をご確認ください。', NULL, NULL,
  '出生・転入などで新たに対象となる場合は申請（認定請求）が必要とされています。申請方法は、子育て応援課の本庁窓口、各支所窓口での提出のほか、マイナポータルによる電子申請に対応しているとされています。詳細・最新の手続きは公式ページでご確認ください。', '請求者名義の通帳またはキャッシュカードの写し、請求者の健康保険証の写しなどが必要とされています。状況により追加書類が求められる場合があるため、公式ページで必要書類をご確認ください。', TRUE,
  'こどもみらい部 子育て応援課 児童手当・医療費支援グループ', '098-861-6951', NULL, 'https://www.city.naha.okinawa.jp/child/kosodateouen/1002849/index.html', '児童手当｜那覇市公式ホームページ',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'requiredDocumentsText', 'applicationDeadlineText', 'targetPeople']::text[], '本ページは那覇市公式サイトの情報をもとにした概要です。対象・金額・所得の取り扱い・手続きは変更される場合があり、個々の状況により異なります。最終的な内容は必ず公式ページおよび担当課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-child-allowance');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'okinawa-naha-child-allowance' and c.slug = 'childcare' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-child-allowance');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'okinawa-naha-child-allowance' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'okinawa-naha-child-allowance'
), updated_source as (
  update public.support_sources src
  set
    title = '児童手当｜那覇市公式ホームページ',
    publisher = coalesce(src.publisher, 'www.city.naha.okinawa.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '8bba112529538849fcea080420e23bcfd0fd23bc212d0d4c8d326ddfb8ece7a3',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.naha.okinawa.jp/child/kosodateouen/1002849/index.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.naha.okinawa.jp/child/kosodateouen/1002849/index.html', '児童手当｜那覇市公式ホームページ', 'www.city.naha.okinawa.jp',
  now(), '2026-06-24', '8bba112529538849fcea080420e23bcfd0fd23bc212d0d4c8d326ddfb8ece7a3', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"okinawa-naha-child-allowance","status":"published","title":"児童手当（那覇市）","officialUrl":"https://www.city.naha.okinawa.jp/child/kosodateouen/1002849/index.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"8bba112529538849fcea080420e23bcfd0fd23bc212d0d4c8d326ddfb8ece7a3"}'::jsonb,
  'seed:okinawa-naha-child-allowance:8bba112529538849fcea080420e23bcfd0fd23bc212d0d4c8d326ddfb8ece7a3'
from public.support_programs sp
where sp.slug = 'okinawa-naha-child-allowance'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'saitama' and m.slug = 'kawagoe'), 'saitama-kawagoe-child-allowance', '児童手当', '高校生年代までの子どもを養育している方に支給される国の制度で、川越市が申請の受付と支給の窓口になっています。支給額や対象の詳細は公式ページでご確認ください。', '子どもを育てている家庭にお金が支給される国の制度です。川越市の窓口・郵送・インターネット（マイナポータル）で申し込みができます。いくらもらえるか、だれが対象になるかは、市の公式ページで確認してください。', 'cash',
  '高校生年代（18歳に達する日以後の最初の3月31日まで）の子どもを養育している方が対象となる可能性があります。対象範囲・支給要件の詳細は公式ページでご確認ください。', '支給額は子どもの年齢や出生順位などにより異なります。最新の支給額は公式ページでご確認ください。', '出生・転入などの事由が生じた日の翌日から原則15日以内の手続きが案内されています。詳細は公式ページでご確認ください。', NULL,
  '川越市役所こども政策課、市民センター、川越駅西口連絡所などの窓口、郵送、またはマイナポータル（ぴったりサービス）でのオンライン申請が案内されています。詳細は公式ページでご確認ください。', '申請者の状況により必要書類が異なる場合があります。必要書類は公式ページでご確認ください。', TRUE,
  'こども未来部 こども政策課 こども給付担当', '049-224-6278', NULL, 'https://www.city.kawagoe.saitama.jp/kosodate/jyosei/1004141/1004144.html', '児童手当｜川越市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'targetPeople']::text[], '本ページは制度の概要を紹介するものです。支給額・所得・対象年齢・申請期限など最新かつ正確な情報は、必ず川越市の公式ページでご確認ください。受給の可否は審査によります。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-child-allowance');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'saitama-kawagoe-child-allowance' and c.slug = 'childcare' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-child-allowance');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'saitama-kawagoe-child-allowance' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'saitama-kawagoe-child-allowance'
), updated_source as (
  update public.support_sources src
  set
    title = '児童手当｜川越市',
    publisher = coalesce(src.publisher, 'www.city.kawagoe.saitama.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '09abeef3341e189a5a668e64d782ea3e8b0a79d326c779aa8537e5ac8be624be',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kawagoe.saitama.jp/kosodate/jyosei/1004141/1004144.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kawagoe.saitama.jp/kosodate/jyosei/1004141/1004144.html', '児童手当｜川越市', 'www.city.kawagoe.saitama.jp',
  now(), '2026-06-24', '09abeef3341e189a5a668e64d782ea3e8b0a79d326c779aa8537e5ac8be624be', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"saitama-kawagoe-child-allowance","status":"published","title":"児童手当","officialUrl":"https://www.city.kawagoe.saitama.jp/kosodate/jyosei/1004141/1004144.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"09abeef3341e189a5a668e64d782ea3e8b0a79d326c779aa8537e5ac8be624be"}'::jsonb,
  'seed:saitama-kawagoe-child-allowance:09abeef3341e189a5a668e64d782ea3e8b0a79d326c779aa8537e5ac8be624be'
from public.support_programs sp
where sp.slug = 'saitama-kawagoe-child-allowance'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'hiroshima' and m.slug = 'fukuyama'), 'hiroshima-fukuyama-child-allowance', '児童手当', '児童手当は、子どもを養育している人の家庭の生活の安定と、子どもの健やかな成長を支えることを目的とした国の制度で、福山市が窓口となって受付・支給を行っています。対象や金額・支給対象年齢などの詳細は福山市の公式案内ページでご確認ください。', '児童手当は、子どもを育てている家庭を支えるための国の制度です。福山市では、市の窓口で申請を受け付けています。もらえる金額や対象になる子どもの年齢などは決まりがあり、変わることもあるので、申請の前に福山市の公式ページや窓口で確認すると安心です。', 'cash',
  '福山市に住民登録があり、高校生年代（18歳到達後の最初の年度末）までの児童を養育している人が対象となる可能性があります。請求者・児童ともに国内居住が要件とされ、公務員の方は勤務先での申請となる場合があります。具体的な対象範囲や要件は公式ページでご確認ください。', '支給額は児童の年齢や子の数（第何子か）によって異なる金額が国の制度として定められています。具体的な金額や算定方法は変更される場合があるため、最新の金額は福山市の公式ページでご確認ください。', '出生・転入などの事由が生じた日の翌日から原則15日以内の申請が案内されています。詳細・例外は公式ページでご確認ください。', NULL,
  '福山市の窓口で申請する方式が案内されています。郵送やオンライン（電子申請）の可否を含め、最新の申請方法は公式ページでご確認ください。', '請求者名義の預金通帳、請求者と配偶者のマイナンバーがわかるもの、本人確認書類などが案内されています。状況により追加書類が必要となる場合があるため、必要書類は公式ページでご確認ください。', FALSE,
  '福山市 みらい世代育成課（給付・医療担当）', '084-928-1070', NULL, 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393467.html', '児童手当制度の概要について - 福山市子育て支援サイト',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'onlineApplicationAvailable', '所得制限の有無', '支給対象年齢の詳細']::text[], '本ページは福山市の公式案内をもとにした概要です。対象・金額・所得の条件・申請方法は変更される場合があり、個別の受給可否は審査によります。必ず福山市の公式ページおよび担当窓口で最新情報をご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-child-allowance');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'hiroshima-fukuyama-child-allowance' and c.slug = 'childcare' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-child-allowance');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'hiroshima-fukuyama-child-allowance' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'hiroshima-fukuyama-child-allowance'
), updated_source as (
  update public.support_sources src
  set
    title = '児童手当制度の概要について - 福山市子育て支援サイト',
    publisher = coalesce(src.publisher, 'www.city.fukuyama.hiroshima.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = 'a102176152d8c8f03e80a0398a91362f3f9e266f4f13873a4763d24425b41f25',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393467.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393467.html', '児童手当制度の概要について - 福山市子育て支援サイト', 'www.city.fukuyama.hiroshima.jp',
  now(), '2026-06-24', 'a102176152d8c8f03e80a0398a91362f3f9e266f4f13873a4763d24425b41f25', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"hiroshima-fukuyama-child-allowance","status":"published","title":"児童手当","officialUrl":"https://www.city.fukuyama.hiroshima.jp/site/kosodate/393467.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"a102176152d8c8f03e80a0398a91362f3f9e266f4f13873a4763d24425b41f25"}'::jsonb,
  'seed:hiroshima-fukuyama-child-allowance:a102176152d8c8f03e80a0398a91362f3f9e266f4f13873a4763d24425b41f25'
from public.support_programs sp
where sp.slug = 'hiroshima-fukuyama-child-allowance'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'aichi' and m.slug = 'toyohashi'), 'aichi-toyohashi-child-allowance', '児童手当', '児童手当は、子どもを養育している方に手当を支給する国の制度で、豊橋市が窓口となって申請・支給を行っています。対象や金額・所得などの要件があります。', '子どもを育てている家庭に、市からお金（手当）が支給される制度です。子どもの年齢や人数で金額が変わります。もらえるかどうかや金額には条件があるので、豊橋市の公式ページで確認してください。申請は豊橋市役所の子育て支援課などで行います。', 'cash',
  '日本国内に住所があり、高校卒業年代（18歳到達後の最初の3月31日）までの児童を養育している方が対象となる可能性があります。詳しい支給対象・要件は公式ページでご確認ください。', '月額は児童の年齢や子の人数（出生順）によって異なります。金額は変更される場合があるため、最新の支給額は公式ページでご確認ください。', '出生・転入など事由発生日の翌日から15日以内の申請が案内されています（15日特例）。詳細は公式ページでご確認ください。', NULL,
  '原則として、豊橋市役所こども未来部子育て支援課（東館2階）または市内の窓口センターでの申請が案内されています。マイナンバーカードをお持ちの場合は、マイナポータル（ぴったりサービス）からのオンライン申請が利用できる場合があります。具体的な手続き・必要書類は公式ページでご確認ください。', '請求者名義の金融機関口座の情報のほか、状況に応じて健康保険証（3歳未満の場合）等の書類が必要となる場合があります。必要書類は申請者の状況により異なるため、公式ページでご確認ください。', TRUE,
  'こども未来部 子育て支援課', '0532-51-2325', NULL, 'https://www.city.toyohashi.lg.jp/45630.htm', '児童手当制度 - 豊橋市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'onlineApplicationAvailable']::text[], '本ページは公式情報をもとにした概要です。支給額・所得制限・対象年齢・申請期限などは変更される場合があり、個別の事情により取り扱いが異なります。最新かつ正確な情報は必ず豊橋市の公式ページでご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-child-allowance');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'aichi-toyohashi-child-allowance' and c.slug = 'childcare' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-child-allowance');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'aichi-toyohashi-child-allowance' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'aichi-toyohashi-child-allowance'
), updated_source as (
  update public.support_sources src
  set
    title = '児童手当制度 - 豊橋市',
    publisher = coalesce(src.publisher, 'www.city.toyohashi.lg.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '6784c20f6356357e6818b2f5d6ec8b70e44e9e928de3d38a0b0fc5c004fdd9eb',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.toyohashi.lg.jp/45630.htm'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.toyohashi.lg.jp/45630.htm', '児童手当制度 - 豊橋市', 'www.city.toyohashi.lg.jp',
  now(), '2026-06-24', '6784c20f6356357e6818b2f5d6ec8b70e44e9e928de3d38a0b0fc5c004fdd9eb', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"aichi-toyohashi-child-allowance","status":"published","title":"児童手当","officialUrl":"https://www.city.toyohashi.lg.jp/45630.htm","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"6784c20f6356357e6818b2f5d6ec8b70e44e9e928de3d38a0b0fc5c004fdd9eb"}'::jsonb,
  'seed:aichi-toyohashi-child-allowance:6784c20f6356357e6818b2f5d6ec8b70e44e9e928de3d38a0b0fc5c004fdd9eb'
from public.support_programs sp
where sp.slug = 'aichi-toyohashi-child-allowance'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'kochi' and m.slug = 'kochi'), 'kochi-kochi-child-medical-aid', '子ども医療費助成事業（高知市）', '高知市が実施する、健康保険に加入している子どもが医療機関を受診したときの保険診療の自己負担分などを助成する制度の案内ページです。対象年齢・所得確認・自己負担の扱いは公式ページで確認が必要です。', '高知市では、子どもが病気やけがで病院にかかったときの医療費（健康保険が使われる部分の自己負担分）を市が助成する「子ども医療費助成事業」があります。公式の案内では、高知市に住み、健康保険に加入している中学生までの子どもが対象とされています。所得制限はないとされていますが、未就学児については事務処理上の所得確認が必要とされています。健康診断や予防接種、保険のきかない診療は対象外です。対象になる年齢の区切りや、自己負担の有無・手続きの細かい条件は変わることがあるため、申し込む前に必ず高知市の公式ページや担当課（子育て給付課）で最新の内容を確認してください。', 'subsidy',
  '高知市内に住み、健康保険に加入している子ども（公式案内では中学生までの児童）が対象となる可能性があります。正確な対象年齢の区切りや要件は高知市の公式ページで確認してください。', '公式案内では、保険診療（入院・通院）および薬剤の一部負担金の自己負担分が助成対象とされています。具体的な助成額・自己負担の有無は高知市の公式ページで確認してください。健康診断・予防接種・保険外診療・食事療養費などは対象外です。', '特定の申請期限は公式案内に明記されていません。詳細は高知市の公式ページで確認してください。', NULL,
  '公式案内では、子育て給付課または各地域の窓口センターでの窓口申請が示されています。郵送・オンライン申請の可否は明記されていないため、高知市の公式ページや担当課で確認してください。', '公式案内では、子どもの健康保険の情報（資格情報通知書・資格確認書・マイナポータル画面など）、保護者の本人確認書類、個人番号（マイナンバー）が確認できるもの、（該当する場合）同意書などが挙げられています。最新の必要書類は高知市の公式ページで確認してください。', FALSE,
  '高知市 こども未来部 子育て給付課', '088-823-9447', NULL, 'https://www.city.kochi.kochi.jp/soshiki/33/iryou1.html', '子ども医療費助成事業 - 高知市ホームページ（子育て給付課）',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'targetPeople', 'applicationMethodText', 'requiredDocumentsText', 'applicationDeadlineText', 'onlineApplicationAvailable']::text[], '本ページは高知市の公式案内をもとにした概要です。対象年齢の区切り、所得確認の要否、自己負担の有無、申請方法・必要書類などは変更される場合があります。申請前に必ず高知市の公式ページおよび担当課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-child-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'kochi-kochi-child-medical-aid' and c.slug = 'medical' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-child-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'kochi-kochi-child-medical-aid' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'kochi-kochi-child-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = '子ども医療費助成事業 - 高知市ホームページ（子育て給付課）',
    publisher = coalesce(src.publisher, 'www.city.kochi.kochi.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '58c87532026d51f16e028a5ccd508e30c4226dad209f99916cd37ac9aba0f22a',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kochi.kochi.jp/soshiki/33/iryou1.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kochi.kochi.jp/soshiki/33/iryou1.html', '子ども医療費助成事業 - 高知市ホームページ（子育て給付課）', 'www.city.kochi.kochi.jp',
  now(), '2026-06-24', '58c87532026d51f16e028a5ccd508e30c4226dad209f99916cd37ac9aba0f22a', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"kochi-kochi-child-medical-aid","status":"published","title":"子ども医療費助成事業（高知市）","officialUrl":"https://www.city.kochi.kochi.jp/soshiki/33/iryou1.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"58c87532026d51f16e028a5ccd508e30c4226dad209f99916cd37ac9aba0f22a"}'::jsonb,
  'seed:kochi-kochi-child-medical-aid:58c87532026d51f16e028a5ccd508e30c4226dad209f99916cd37ac9aba0f22a'
from public.support_programs sp
where sp.slug = 'kochi-kochi-child-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'okinawa' and m.slug = 'naha'), 'okinawa-naha-child-medical-aid', 'こども医療費助成制度', '那覇市が、保護者が支払った子どもの医療費（保険診療の自己負担分）の一部を助成する制度とされています。対象年齢・所得制限・自己負担などの詳細は公式ページでの確認が必要です。', '那覇市に住んでいて健康保険に入っている子どもの医療費（病院で支払う自己負担分）の一部を、那覇市が助成する制度とされています。受けるには資格認定の申請（窓口・郵送・オンライン）が必要と案内されています。対象になる年齢や所得の条件、いくら助成されるかなどは市によって決まっているため、必ず那覇市の公式ページで最新の内容を確認してください。', 'subsidy',
  '那覇市に住所があり、いずれかの健康保険に加入している子どもを養育する保護者が対象となる可能性があります。対象年齢の範囲（公式では0歳から中学校3年生までと案内）や所得制限の有無など、適用条件の詳細は公式ページで確認してください。', '保険診療の自己負担分の一部を助成するとされています（入院時食事療養費は対象外と案内）。助成額・自己負担限度額の詳細は公式ページで確認してください。', '公式では、診療を受けた月の翌月1日から2年以内に申請する必要があると案内されています。詳細は公式ページで確認してください。', NULL,
  '資格認定の申請が必要とされています。子育て応援課 医療費支援グループの窓口（本庁舎3階47番）のほか、郵送申請、オンライン申請の案内があります。詳細は公式ページで確認してください。', 'マイナンバーカードまたは資格確認書、保護者名義の普通預金通帳、転入者の場合は課税証明書等が案内されています。必要書類は状況により異なる場合があるため公式ページで確認してください。', TRUE,
  '那覇市 子育て応援課 医療費支援グループ', '098-861-6951', NULL, 'https://www.city.naha.okinawa.jp/child/kosodateouen/kodomoiryouhijyosei/20240724.html', 'こども医療費助成制度｜那覇市公式ホームページ',
  '2026-06-24', 'high', ARRAY['対象年齢の上限・適用範囲', '所得制限の有無と基準', '自己負担額・自己負担限度額', '助成方法（現物給付・自動償還等）', '助成額の具体的内容']::text[], '本ページは公開情報をもとにした概要であり、制度の適用を確約するものではありません。実際に助成を受けられるかは審査によります。対象要件・所得制限・自己負担・対象年齢・助成方法などは変更される場合があり、最終的な内容は必ず那覇市の公式ページおよび担当課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-child-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'okinawa-naha-child-medical-aid' and c.slug = 'medical' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-child-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'okinawa-naha-child-medical-aid' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'okinawa-naha-child-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = 'こども医療費助成制度｜那覇市公式ホームページ',
    publisher = coalesce(src.publisher, 'www.city.naha.okinawa.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '49dd34263036abf20a3e5abb6ef5d8fc957897b5bff846833853bf5fcbe930f4',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.naha.okinawa.jp/child/kosodateouen/kodomoiryouhijyosei/20240724.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.naha.okinawa.jp/child/kosodateouen/kodomoiryouhijyosei/20240724.html', 'こども医療費助成制度｜那覇市公式ホームページ', 'www.city.naha.okinawa.jp',
  now(), '2026-06-24', '49dd34263036abf20a3e5abb6ef5d8fc957897b5bff846833853bf5fcbe930f4', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"okinawa-naha-child-medical-aid","status":"published","title":"こども医療費助成制度","officialUrl":"https://www.city.naha.okinawa.jp/child/kosodateouen/kodomoiryouhijyosei/20240724.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"49dd34263036abf20a3e5abb6ef5d8fc957897b5bff846833853bf5fcbe930f4"}'::jsonb,
  'seed:okinawa-naha-child-medical-aid:49dd34263036abf20a3e5abb6ef5d8fc957897b5bff846833853bf5fcbe930f4'
from public.support_programs sp
where sp.slug = 'okinawa-naha-child-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'saitama' and m.slug = 'kawagoe'), 'saitama-kawagoe-child-medical-aid', 'こども医療費支給制度', '川越市では、市内に住所があり健康保険に加入している子どもの保険診療の自己負担分について、医療費の助成（支給）を行っている可能性があります。対象年齢・自己負担・所得制限などの詳細は公式ページでご確認ください。', '川越市では、子どもが病院などで健康保険を使って診療を受けたときの自己負担分について、市が医療費を助成（支給）する制度がある可能性があります。対象になるのは、川越市に住んでいて健康保険に入っている子どもを育てている保護者です。対象年齢や自己負担があるかどうか、所得の制限があるかどうかは市によって異なるため、必ず川越市の公式ページや窓口で確認してください。引っ越しや出生などで新しく対象になる場合は、受給資格の登録申請が必要とされています。', 'subsidy',
  '川越市に住所があり、健康保険に加入している高校生年代までの子どもを養育する保護者が対象となる可能性があります。生活保護を受けている場合や、他の医療費助成制度（ひとり親家庭等医療費・重度心身障害者医療費など）の支給を受けている場合は対象外となることがあります。該当するかどうかは公式ページや窓口でご確認ください。', '健康保険が適用となる入院・通院・調剤などの自己負担分が助成（支給）の対象とされていますが、具体的な助成額・自己負担の有無・上限などは公式ページでご確認ください。高額療養費や付加給付、他の医療費助成制度の利用分は除かれる場合があります。', NULL, NULL,
  '出生・転入などにより新たに対象となる場合は、受給資格の登録申請が必要とされています。申請方法は、こども政策課・市民センター・駅西口連絡所などの窓口申請、郵送申請、電子申請があるとされています。詳細・最新の方法は公式ページでご確認ください。', '健康保険の情報がわかるもの、振込先口座の確認書類、マイナンバー確認書類、保護者の本人確認書類などが必要とされています。最新の必要書類は公式ページでご確認ください。', TRUE,
  '川越市 こども未来部 こども政策課 こども給付担当', '049-224-6278', NULL, 'https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006625.html', 'こども医療費支給制度｜川越市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', '対象年齢', '自己負担', '所得制限', 'requiredDocumentsText', 'applicationDeadlineText']::text[], '本ページは公開情報をもとにした概要であり、対象・金額・自己負担・所得制限・申請方法などは変更される場合があります。実際の受給可否や詳細は、必ず川越市の公式ページおよび担当窓口でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-child-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'saitama-kawagoe-child-medical-aid' and c.slug = 'medical' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-child-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'saitama-kawagoe-child-medical-aid' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'saitama-kawagoe-child-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = 'こども医療費支給制度｜川越市',
    publisher = coalesce(src.publisher, 'www.city.kawagoe.saitama.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '303cce06b04aa2c478d77347cb332e168eef3008979feb9ddc07a49fb7e1c534',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006625.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006625.html', 'こども医療費支給制度｜川越市', 'www.city.kawagoe.saitama.jp',
  now(), '2026-06-24', '303cce06b04aa2c478d77347cb332e168eef3008979feb9ddc07a49fb7e1c534', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"saitama-kawagoe-child-medical-aid","status":"published","title":"こども医療費支給制度","officialUrl":"https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006625.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"303cce06b04aa2c478d77347cb332e168eef3008979feb9ddc07a49fb7e1c534"}'::jsonb,
  'seed:saitama-kawagoe-child-medical-aid:303cce06b04aa2c478d77347cb332e168eef3008979feb9ddc07a49fb7e1c534'
from public.support_programs sp
where sp.slug = 'saitama-kawagoe-child-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'hiroshima' and m.slug = 'fukuyama'), 'hiroshima-fukuyama-child-medical-aid', '子ども医療費助成事業', '福山市にお住まいで健康保険に加入している子どもの医療費の一部を市が助成する制度の案内です。対象年齢や自己負担、申請方法などの詳細は福山市の公式ページでご確認ください。', '福山市では、子どもが病院にかかったときの医療費の一部を市が助けてくれる制度があります。対象になるかどうかや、いくら自分で払うか、申し込みのしかたは、市の公式ホームページで確認してください。申し込みは窓口・郵送・インターネットからできると案内されています。', 'subsidy',
  '福山市に住所があり、健康保険に加入している子ども（公式情報では0歳から中学3年生＝15歳到達後最初の3月31日までと案内）を養育している保護者が対象となる可能性があります。対象年齢の範囲や具体的な要件は変更される場合があるため、必ず公式ページでご確認ください。', '公式情報では、医療機関での自己負担は1医療機関につき1日500円（500円未満はその金額）とされ、通院は月4日まで・入院は月14日までを上限に、それ以降は同一医療機関で無料、院外薬局は無料と案内されています。所得制限は2023年10月1日から撤廃されたとされています。金額・自己負担・上限・所得制限の最新の取り扱いは公式でご確認ください。', '公式案内では、受給資格の申請は出生日または転入日の翌日から数えて14日以内とされています。期限の詳細は公式でご確認ください。', NULL,
  '公式案内では、受給資格の申請は窓口・郵送・オンライン（電子申請）から選択できるとされています。みらい世代育成課のほか、松永保健福祉課・北部保健福祉課など各支所・分室でも申請できると案内されています。具体的な手続きは公式ページでご確認ください。', '公式案内では、子どもの健康保険の情報を証明するもの（保険者が発行した資格確認書等）の提出が審査に必要とされ、出生時と転入時で必要書類が異なる場合があるとされています。詳細は公式ページでご確認ください。', TRUE,
  '福山市 みらい世代育成課', '084-928-1070', NULL, 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393495.html', '子ども医療費助成事業の概要について - 福山市子育て支援サイト',
  '2026-06-24', 'high', ARRAY['targetPeople', 'benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText']::text[], '本ページは公式情報をもとにした概要案内です。対象年齢・自己負担・所得制限・申請期限・必要書類などは変更される場合があり、個別の判断は行えません。最新かつ正確な内容は福山市の公式ページまたは担当課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-child-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'hiroshima-fukuyama-child-medical-aid' and c.slug = 'medical' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-child-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'hiroshima-fukuyama-child-medical-aid' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'hiroshima-fukuyama-child-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = '子ども医療費助成事業の概要について - 福山市子育て支援サイト',
    publisher = coalesce(src.publisher, 'www.city.fukuyama.hiroshima.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = 'f96b502f9376554a8ff815adff7bf37d1740017069dfd6c70ccc1181facbfbd1',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393495.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393495.html', '子ども医療費助成事業の概要について - 福山市子育て支援サイト', 'www.city.fukuyama.hiroshima.jp',
  now(), '2026-06-24', 'f96b502f9376554a8ff815adff7bf37d1740017069dfd6c70ccc1181facbfbd1', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"hiroshima-fukuyama-child-medical-aid","status":"published","title":"子ども医療費助成事業","officialUrl":"https://www.city.fukuyama.hiroshima.jp/site/kosodate/393495.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"f96b502f9376554a8ff815adff7bf37d1740017069dfd6c70ccc1181facbfbd1"}'::jsonb,
  'seed:hiroshima-fukuyama-child-medical-aid:f96b502f9376554a8ff815adff7bf37d1740017069dfd6c70ccc1181facbfbd1'
from public.support_programs sp
where sp.slug = 'hiroshima-fukuyama-child-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'aichi' and m.slug = 'toyohashi'), 'aichi-toyohashi-child-medical-aid', '豊橋市 子ども医療費助成', '豊橋市が、子どもの保険診療の自己負担分を助成する制度の案内ページです。対象年齢や自己負担などの詳細は公式ページでご確認ください。', '豊橋市に住む子どもが病院にかかったとき、健康保険の自己負担分の医療費を市が助成する制度です。受給者証を病院の窓口で見せると、保険が使える治療では自己負担なしで受診できる場合があります。対象年齢や対象になる人の条件、入院食事代など対象外のものは市の公式ページで確認してください。', 'subsidy',
  '豊橋市内に住所があり、国内の健康保険に加入している子ども（公式では18歳到達年度末までと案内）が対象となる可能性があります。生活保護受給など他制度の状況によっては対象とならない場合もあります。実際の対象範囲は公式ページ・担当課でご確認ください。', '保険診療の自己負担分を助成（公式では18歳到達年度末までを対象と案内。入院食事代・薬容器代などは対象外とされる）。具体的な助成範囲・自己負担の有無は公式ページで確認してください。', '公式ページに記載なし（申請のタイミング・期限は市へお問い合わせください）', NULL,
  '市役所東館2階の子育て支援課の窓口で申請できるほか、近くの窓口センターでも受付されます（窓口センターでの申請は受給者証が後日郵送となる場合あり）。県内の医療機関では受給者証を保険証とあわせて窓口で提示します。郵送申請やオンライン申請の可否は公式ページでご確認ください。', '子どもの健康保険証（マイナ保険証、資格確認書、資格情報のお知らせ等）など。申請書等の要否を含め詳細は公式ページでご確認ください。', FALSE,
  '豊橋市 こども未来部 子育て支援課', '0532-51-2335', NULL, 'https://www.city.toyohashi.lg.jp/41310.htm', '子ども医療費について - 豊橋市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'targetPeople', '対象年齢', '所得制限', '自己負担', 'applicationMethodText', 'applicationDeadlineText', 'onlineApplicationAvailable']::text[], '本ページは豊橋市公式サイトの案内をもとにした概要です。対象年齢・所得制限・自己負担・申請方法など制度の詳細や最新情報は、必ず豊橋市の公式ページおよび担当課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-child-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'aichi-toyohashi-child-medical-aid' and c.slug = 'medical' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-child-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'aichi-toyohashi-child-medical-aid' and le.slug = 'childcare' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'aichi-toyohashi-child-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = '子ども医療費について - 豊橋市',
    publisher = coalesce(src.publisher, 'www.city.toyohashi.lg.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = 'f811797e2921ba2796a8f41f7b3837926841da2a106727d71872938471636cce',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.toyohashi.lg.jp/41310.htm'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.toyohashi.lg.jp/41310.htm', '子ども医療費について - 豊橋市', 'www.city.toyohashi.lg.jp',
  now(), '2026-06-24', 'f811797e2921ba2796a8f41f7b3837926841da2a106727d71872938471636cce', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"aichi-toyohashi-child-medical-aid","status":"published","title":"豊橋市 子ども医療費助成","officialUrl":"https://www.city.toyohashi.lg.jp/41310.htm","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"f811797e2921ba2796a8f41f7b3837926841da2a106727d71872938471636cce"}'::jsonb,
  'seed:aichi-toyohashi-child-medical-aid:f811797e2921ba2796a8f41f7b3837926841da2a106727d71872938471636cce'
from public.support_programs sp
where sp.slug = 'aichi-toyohashi-child-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'kochi' and m.slug = 'kochi'), 'kochi-kochi-single-parent-medical-aid', 'ひとり親家庭等医療費助成（マル親）', '高知市が実施する、ひとり親家庭の親と児童などを対象に、保険診療分の一部負担金を助成する制度です。対象や所得要件、助成範囲は公式ページでの確認が必要です。', 'ひとり親（母子・父子）家庭の親と子どもや、両親のいない子どもとその養育者などが、病院などで支払う保険診療分の自己負担の一部を高知市が助成する可能性がある制度です。所得が一定以下であることなどの要件があり、対象になるかどうかは申請して認定を受ける必要があります。詳しい対象・金額・所得制限・必要書類は高知市の公式ページや子育て給付課でご確認ください。', 'subsidy',
  '高知市にお住まいで、18歳までの子どもがいるひとり親家庭の親と児童、または両親のいない子どもとその養育者などが対象となる可能性があります。所得税が課税されていない世帯であることなどの要件があり、年齢区分・所得要件の詳細は公式での確認が必要です。', '保険診療分の一部負担金を助成（具体的な自己負担額・助成範囲は高知市公式で要確認）。', '明確な申請期限の記載は確認できませんでした。原則として「申請された翌月から助成」とされているため、詳細は公式・担当課でご確認ください。', NULL,
  '高知市子育て給付課の窓口での申請が案内されています。申請して認定を受けることで、原則として申請された翌月分から助成の対象となります。郵送・オンライン申請の可否は公式で確認してください。', '本人確認書類、個人番号（マイナンバー）の確認書類、健康保険の資格情報がわかるもの（資格情報のお知らせ・資格確認書・マイナポータル画面等）、同意書などが案内されています。児童扶養手当を申請していない場合は戸籍謄本、賃貸契約書の写し等が必要な場合があります。最新の必要書類は公式で確認してください。', FALSE,
  '高知市 子育て給付課', '088-823-9447', NULL, 'https://www.city.kochi.kochi.jp/soshiki/33/iryou2.html', 'ひとり親家庭医療費助成事業 - 高知市公式ホームページ',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'targetPeople', 'applicationDeadlineText', 'requiredDocumentsText', 'onlineApplicationAvailable']::text[], '対象・所得制限・助成範囲・自己負担・必要書類・申請方法は変更される場合があり、また個別の状況により異なります。実際に受給できるかどうかは高知市の審査・認定によります。最新かつ正確な情報は高知市公式ページおよび子育て給付課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-single-parent-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'kochi-kochi-single-parent-medical-aid' and c.slug = 'single-parent' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-single-parent-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'kochi-kochi-single-parent-medical-aid' and le.slug = 'single-parent' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'kochi-kochi-single-parent-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = 'ひとり親家庭医療費助成事業 - 高知市公式ホームページ',
    publisher = coalesce(src.publisher, 'www.city.kochi.kochi.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = 'e57e9f0f7fe2f5a94c04d8fba2ede134b68136e568a3ed2531b16d61d2c2d7c5',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kochi.kochi.jp/soshiki/33/iryou2.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kochi.kochi.jp/soshiki/33/iryou2.html', 'ひとり親家庭医療費助成事業 - 高知市公式ホームページ', 'www.city.kochi.kochi.jp',
  now(), '2026-06-24', 'e57e9f0f7fe2f5a94c04d8fba2ede134b68136e568a3ed2531b16d61d2c2d7c5', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"kochi-kochi-single-parent-medical-aid","status":"published","title":"ひとり親家庭等医療費助成（マル親）","officialUrl":"https://www.city.kochi.kochi.jp/soshiki/33/iryou2.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"e57e9f0f7fe2f5a94c04d8fba2ede134b68136e568a3ed2531b16d61d2c2d7c5"}'::jsonb,
  'seed:kochi-kochi-single-parent-medical-aid:e57e9f0f7fe2f5a94c04d8fba2ede134b68136e568a3ed2531b16d61d2c2d7c5'
from public.support_programs sp
where sp.slug = 'kochi-kochi-single-parent-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'okinawa' and m.slug = 'naha'), 'okinawa-naha-single-parent-medical-aid', '母子及び父子家庭等医療費助成制度（ひとり親家庭等医療費助成・マル親）', '那覇市が、ひとり親家庭（母子・父子家庭）の親と児童、養育者などの保険診療の自己負担分の一部を助成する制度とされています。助成内容・所得制限・自己負担額などは公式ページおよび「制度のしおり」で確認が必要です。', '那覇市でひとり親家庭などの親や子どもが病院にかかったとき、保険診療の自己負担分の一部を市が助成してくれる制度とされています。外来は1医療機関ごとに月1,000円までの自己負担、入院は食事代を除いた額が助成対象とされています。所得制限があり、対象になるかどうかや金額の詳細は那覇市の公式ページや「制度のしおり」で確認してください。問い合わせは那覇市こどもみらい部 子育て応援課（098-861-6951）です。', 'subsidy',
  '那覇市にお住まいで、母子家庭の母・父子家庭の父およびその監護する児童、配偶者が一定の障がいの状態にある母（父）と児童、父母のいない児童とその養育者などが対象となる可能性があります。児童は「18歳に達した日以後最初の3月末日まで（一定の障がいがある場合は20歳に達する日の属する月の末日まで）」とされています。所得制限（児童扶養手当法施行令に定める一部支給に準じた所得制限）があるとされ、対象可否は公式で確認してください。', '保険診療の自己負担分のうち、外来は一部負担金（1人・同月・1医療機関につき1,000円とされる）、入院は食事療養費を差し引いた額が助成対象とされています。金額・自己負担の詳細は変更の可能性があるため公式ページで確認してください。', '公式ページに明確な申請期限の記載は確認できませんでした。詳細は那覇市の公式案内で確認してください。', NULL,
  '県内の協力医療機関で受給者証と健康保険の資格確認により自動的に助成を受ける「自動償還方式」のほか、受診月の翌月1日以降に子育て応援課窓口で領収書（原本）により申請する「償還払」があるとされています。受給資格の登録申請手続きや必要書類の詳細は公式で確認してください。', '受給者証、加入している健康保険の資格が確認できる書類、領収書（原本）などが必要とされています。新規の受給資格登録に必要な書類は公式で確認してください。', FALSE,
  'こどもみらい部 子育て応援課 児童手当・医療費支援グループ', '098-861-6951', NULL, 'https://www.city.naha.okinawa.jp/child/kosodateouen/boshihusikateitou/HKOSODA00320240930085344008.html', '母子及び父子家庭等医療費助成制度｜那覇市公式ホームページ',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', '所得制限の具体的な金額', '対象年齢の詳細', '自己負担額', '新規申請（受給資格登録）の手続き詳細']::text[], '本ページは那覇市公式サイトの情報をもとに作成した参考情報です。所得制限・助成内容・自己負担額・対象範囲などは変更される場合があり、また個別の事情により対象可否が異なります。正確な情報・最新の内容は必ず那覇市の公式ページおよび担当課でご確認ください。当サイトは申請の代行や受給の保証を行うものではありません。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-single-parent-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'okinawa-naha-single-parent-medical-aid' and c.slug = 'single-parent' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-single-parent-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'okinawa-naha-single-parent-medical-aid' and le.slug = 'single-parent' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'okinawa-naha-single-parent-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = '母子及び父子家庭等医療費助成制度｜那覇市公式ホームページ',
    publisher = coalesce(src.publisher, 'www.city.naha.okinawa.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = 'db249935bdcf35be52230a46280172cde4fe2f8822d4257f89aa5ef6fccb74ef',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.naha.okinawa.jp/child/kosodateouen/boshihusikateitou/HKOSODA00320240930085344008.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.naha.okinawa.jp/child/kosodateouen/boshihusikateitou/HKOSODA00320240930085344008.html', '母子及び父子家庭等医療費助成制度｜那覇市公式ホームページ', 'www.city.naha.okinawa.jp',
  now(), '2026-06-24', 'db249935bdcf35be52230a46280172cde4fe2f8822d4257f89aa5ef6fccb74ef', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"okinawa-naha-single-parent-medical-aid","status":"published","title":"母子及び父子家庭等医療費助成制度（ひとり親家庭等医療費助成・マル親）","officialUrl":"https://www.city.naha.okinawa.jp/child/kosodateouen/boshihusikateitou/HKOSODA00320240930085344008.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"db249935bdcf35be52230a46280172cde4fe2f8822d4257f89aa5ef6fccb74ef"}'::jsonb,
  'seed:okinawa-naha-single-parent-medical-aid:db249935bdcf35be52230a46280172cde4fe2f8822d4257f89aa5ef6fccb74ef'
from public.support_programs sp
where sp.slug = 'okinawa-naha-single-parent-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'saitama' and m.slug = 'kawagoe'), 'saitama-kawagoe-single-parent-medical-aid', 'ひとり親家庭等医療費支給制度', '川越市が、ひとり親家庭等の親と児童などを対象に、保険診療の自己負担分の医療費を助成する制度とされています。所得制限や対象年齢などの詳細は公式ページでの確認が必要です。', 'ひとり親の家庭などで、親や子どもが病院にかかったときの医療費(健康保険が使う部分の自己負担)を、川越市が助成する制度とされています。埼玉県内の病院などでは、受給者証を見せると窓口でのお金の支払いがいらなくなる場合があります。対象になる子どもの年齢や、所得(収入)の制限など細かい条件があり、人によって対象かどうかが変わります。ひとり親家庭になった日や引っ越してきた日の翌日から15日以内に、こども政策課の窓口で申し込むよう案内されています。自分が対象になるか、金額や必要な書類は、必ず川越市の公式ページや窓口で確認してください。', 'subsidy',
  '児童を監護する母・父、または父母に代わって児童を養育している養育者と、その対象児童などが対象となる可能性があります。対象児童の年齢の範囲や所得などの要件があるため、自分が対象になるかは公式ページや窓口でご確認ください。', '保険適用分(保険診療の自己負担分)の医療費について、埼玉県内の保険医療機関等では受給者証の提示により窓口での支払いが不要になる(現物給付)とされています。県外受診などは一旦支払い後に申請して払い戻しを受ける方式とされる場合があります。助成の範囲・自己負担・対象外となる費用などの詳細は公式ページでご確認ください。', '市の案内では、ひとり親家庭の対象となった日や転入日の翌日から15日以内に申請をするよう求められています。期限や起算日の詳細は公式ページでご確認ください。', NULL,
  '市の案内では、原則として申請者本人がこども政策課の窓口で手続きをする必要があるとされています。変更届などの一部手続きは電子申請に対応する場合があるとされています。詳細は公式ページや窓口でご確認ください。', '児童扶養手当を受給できるかどうかなどによって必要書類が異なるとされています。健康保険の資格がわかるもの(マイナ保険証・資格確認書など)等が必要になる場合があります。最新の必要書類は公式ページや窓口でご確認ください。', FALSE,
  '川越市 こども未来部 こども政策課 こども給付担当', '049-224-6278', NULL, 'https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006626.html', 'ひとり親家庭等医療費支給制度｜川越市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'targetPeople', 'applicationDeadlineText', 'requiredDocumentsText', '対象児童の年齢', '所得制限額', '自己負担の有無']::text[], '本ページは公式情報をもとにした概要であり、対象・金額・所得制限・対象年齢・自己負担・手続きは変更される場合があります。最新かつ正確な情報は、必ず川越市の公式ページおよびこども政策課の窓口でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-single-parent-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'saitama-kawagoe-single-parent-medical-aid' and c.slug = 'single-parent' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-single-parent-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'saitama-kawagoe-single-parent-medical-aid' and le.slug = 'single-parent' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'saitama-kawagoe-single-parent-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = 'ひとり親家庭等医療費支給制度｜川越市',
    publisher = coalesce(src.publisher, 'www.city.kawagoe.saitama.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '8b4f675e2836023fe38dcb7cad5e445332eb1e8b7439476cbeac8404b38845c5',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006626.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006626.html', 'ひとり親家庭等医療費支給制度｜川越市', 'www.city.kawagoe.saitama.jp',
  now(), '2026-06-24', '8b4f675e2836023fe38dcb7cad5e445332eb1e8b7439476cbeac8404b38845c5', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"saitama-kawagoe-single-parent-medical-aid","status":"published","title":"ひとり親家庭等医療費支給制度","officialUrl":"https://www.city.kawagoe.saitama.jp/kenko/iryo/1006606/1006615/1006622/1006626.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"8b4f675e2836023fe38dcb7cad5e445332eb1e8b7439476cbeac8404b38845c5"}'::jsonb,
  'seed:saitama-kawagoe-single-parent-medical-aid:8b4f675e2836023fe38dcb7cad5e445332eb1e8b7439476cbeac8404b38845c5'
from public.support_programs sp
where sp.slug = 'saitama-kawagoe-single-parent-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'hiroshima' and m.slug = 'fukuyama'), 'hiroshima-fukuyama-single-parent-medical-aid', 'ひとり親家庭等医療費助成事業（マル親）', '福山市が実施する、ひとり親家庭等の親や児童などを対象に、保険診療の医療費の一部を助成する制度です。自己負担額・所得制限・対象範囲には条件があり、詳細は市の公式ページで確認が必要です。', 'ひとり親家庭などの親や子どもが、病院などにかかったときの医療費の一部を福山市が助成する制度です。だれが対象になるか、いくら助成されるか、所得の条件などは決まりがあるので、福山市の公式ページで確認してください。', 'subsidy',
  '配偶者のいない人で、18歳に達する日以後の最初の3月31日までの間にある児童を扶養している人や、その児童本人などが対象となる可能性があります。所得税の課税状況など一定の条件があるため、自分が対象になるかは市の公式情報で確認してください。', '保険診療分の医療費の一部が助成されます。1医療機関あたりの1日の自己負担額や上限、院外薬局の取扱いなどの条件がありますが、金額や条件は変更される場合があるため、最新の内容は公式ページで確認してください。', '公式ページで確認してください。', NULL,
  '市の窓口での申請のほか、郵送や一部電子申請に対応している場合があります。申請方法・受付窓口の詳細は公式ページまたは担当課にご確認ください。', '本人確認書類、健康保険の資格を確認できるもの、マイナンバーのわかるもののほか、場合により戸籍に関する書類などが必要となることがあります。必要書類は状況により異なるため、公式ページまたは担当課でご確認ください。', TRUE,
  '福山市 みらい世代育成課', '084-928-1070', NULL, 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393527.html', 'ひとり親家庭等医療費助成事業について - 福山市子育て支援サイト',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', '所得制限の具体的基準', '対象年齢の詳細（障がいのある児童の取扱い等）', '自己負担額（1医療機関1日あたり等）', 'requiredDocumentsText', 'contactName', 'contactPhone']::text[], '本ページは公式情報をもとにした概要です。対象条件・助成額・所得制限・必要書類などは変更される場合があり、最終的な可否や詳細は福山市の公式ページおよび担当課で必ずご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-single-parent-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'hiroshima-fukuyama-single-parent-medical-aid' and c.slug = 'single-parent' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-single-parent-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'hiroshima-fukuyama-single-parent-medical-aid' and le.slug = 'single-parent' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'hiroshima-fukuyama-single-parent-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = 'ひとり親家庭等医療費助成事業について - 福山市子育て支援サイト',
    publisher = coalesce(src.publisher, 'www.city.fukuyama.hiroshima.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '5dbac7a8780d4899e48d4b3440e40d24015809ad3fb44f629b2923a11f61f5b7',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393527.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.fukuyama.hiroshima.jp/site/kosodate/393527.html', 'ひとり親家庭等医療費助成事業について - 福山市子育て支援サイト', 'www.city.fukuyama.hiroshima.jp',
  now(), '2026-06-24', '5dbac7a8780d4899e48d4b3440e40d24015809ad3fb44f629b2923a11f61f5b7', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"hiroshima-fukuyama-single-parent-medical-aid","status":"published","title":"ひとり親家庭等医療費助成事業（マル親）","officialUrl":"https://www.city.fukuyama.hiroshima.jp/site/kosodate/393527.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"5dbac7a8780d4899e48d4b3440e40d24015809ad3fb44f629b2923a11f61f5b7"}'::jsonb,
  'seed:hiroshima-fukuyama-single-parent-medical-aid:5dbac7a8780d4899e48d4b3440e40d24015809ad3fb44f629b2923a11f61f5b7'
from public.support_programs sp
where sp.slug = 'hiroshima-fukuyama-single-parent-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'aichi' and m.slug = 'toyohashi'), 'aichi-toyohashi-single-parent-medical-aid', '母子父子家庭等医療費助成制度（ひとり親家庭等医療費助成・マル親）', '豊橋市の「母子父子家庭等医療費助成制度」は、ひとり親家庭等を対象に、保険診療の自己負担分を助成する制度とされています。受給には「母子父子家庭等医療費受給者証」の交付が必要で、所得制限があるとされています。対象範囲・所得制限の詳細は公式でご確認ください。', 'ひとり親家庭などのために、病院でかかったお金（健康保険が使う分の自己負担）を市が助けてくれる制度です。利用するには「母子父子家庭等医療証（受給者証）」をもらう手続きが必要です。所得（収入）による制限があります。くわしい対象や金額は、豊橋市の公式ページや子育て支援課（電話 0532-51-2335）でご確認ください。', 'subsidy',
  '母子父子家庭で18歳以下の児童を扶養している母・父および児童、ならびに父母のいない児童などが対象となる可能性があります。具体的な対象条件・年齢要件・所得制限は世帯状況により異なるため、公式でご確認ください。', '保険診療の自己負担分が助成の対象とされています。入院時の食事代・容器代等は対象外とされています。自己負担の有無など詳細は公式でご確認ください。', '本ページに申請期限の明記はありません。詳細は公式または担当課にご確認ください。', NULL,
  '受給には「母子父子家庭等医療費受給者証」の交付申請が必要とされています。担当課（こども未来部 子育て支援課）の窓口での手続きが基本とみられます。県外の医療機関での受診や保険証未提示での受診は、申請による払い戻し（償還払い）になるとされています。具体的な申請窓口・受付方法は公式でご確認ください。', '必要書類は本ページに明記されていません。申請にあたっての持ち物・必要書類は公式または担当課にご確認ください。', FALSE,
  '豊橋市 こども未来部 子育て支援課', '0532-51-2335', NULL, 'https://www.city.toyohashi.lg.jp/41354.htm', '母子父子家庭等医療費助成 - 豊橋市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'targetPeople', 'applicationMethodText', 'requiredDocumentsText', 'applicationDeadlineText', '所得制限の具体額', '対象年齢の上限の詳細', '自己負担の有無', '受給者証の更新時期', 'onlineApplicationAvailable']::text[], '本ページは豊橋市公式サイト（https://www.city.toyohashi.lg.jp/41354.htm）の記載に基づく参考情報です。豊橋市では本制度を「母子父子家庭等医療費助成制度」と呼称しており、愛知県のひとり親家庭等医療費助成（通称マル親）に相当します。対象・所得制限・助成内容・申請方法は変更される場合があり、また世帯状況により異なります。受給可否を保証するものではありません。最新かつ正確な情報は必ず公式ページまたは担当課（子育て支援課 0532-51-2335）でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-single-parent-medical-aid');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'aichi-toyohashi-single-parent-medical-aid' and c.slug = 'single-parent' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-single-parent-medical-aid');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'aichi-toyohashi-single-parent-medical-aid' and le.slug = 'single-parent' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'aichi-toyohashi-single-parent-medical-aid'
), updated_source as (
  update public.support_sources src
  set
    title = '母子父子家庭等医療費助成 - 豊橋市',
    publisher = coalesce(src.publisher, 'www.city.toyohashi.lg.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '6f22790168874b183f7e6a9664d6f34f299d3c1bf16f4f1a2b5659d4edc2fbbf',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.toyohashi.lg.jp/41354.htm'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.toyohashi.lg.jp/41354.htm', '母子父子家庭等医療費助成 - 豊橋市', 'www.city.toyohashi.lg.jp',
  now(), '2026-06-24', '6f22790168874b183f7e6a9664d6f34f299d3c1bf16f4f1a2b5659d4edc2fbbf', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"aichi-toyohashi-single-parent-medical-aid","status":"published","title":"母子父子家庭等医療費助成制度（ひとり親家庭等医療費助成・マル親）","officialUrl":"https://www.city.toyohashi.lg.jp/41354.htm","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"6f22790168874b183f7e6a9664d6f34f299d3c1bf16f4f1a2b5659d4edc2fbbf"}'::jsonb,
  'seed:aichi-toyohashi-single-parent-medical-aid:6f22790168874b183f7e6a9664d6f34f299d3c1bf16f4f1a2b5659d4edc2fbbf'
from public.support_programs sp
where sp.slug = 'aichi-toyohashi-single-parent-medical-aid'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'kochi' and m.slug = 'kochi'), 'kochi-kochi-livelihood-consultation', '生活困窮者自立支援制度（高知市生活支援相談センター・自立相談支援）', '高知市が実施する生活困窮者自立支援制度の自立相談支援です。経済的な困りごとや複合的な生活課題を抱える方の相談を、高知市生活支援相談センターで無料で受け付け、課題の整理や助言、専門機関との連携による支援につなげるとされています。', 'お金や仕事、住まい、健康など、暮らしの困りごとをひとりで抱えている方のための無料の相談窓口です。高知市生活支援相談センターに電話や来所で相談でき、相談員が一緒に困りごとを整理し、必要な支援や専門機関につないでくれるとされています。まずは電話で相談・予約をすることがすすめられています。', 'consultation',
  '失業して次の仕事が見つからない、税金・保険料の滞納がある、住む場所を失った、家計管理が難しい、病気や障害で不安があるなど、生活に困窮し複合的な課題を抱えている市民が対象となる可能性があります。具体的な対象範囲は公式で確認してください。', '自立相談支援は相談支援サービスのため金銭給付ではありません。関連する給付（住居確保給付金等）の有無・金額は公式で確認してください。', NULL, NULL,
  '高知市生活支援相談センターへの電話相談または来所相談が案内されています。事前の電話予約が推奨されています。相談センター電話：088-856-5529（受付：月～金曜 9時～17時、土日祝・年末年始は休み）、所在地：高知市丸ノ内1丁目7番45号 総合あんしんセンター3階。オンライン申請の可否は公式で確認してください。', NULL, FALSE,
  '高知市健康福祉部福祉管理課（相談窓口：高知市生活支援相談センター）', '088-823-9444', NULL, 'https://www.city.kochi.kochi.jp/soshiki/30/shien2.html', '困窮者自立支援制度について（高知市ホームページ・福祉管理課）',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'onlineApplicationAvailable', 'targetPeople', '受付時間の最新情報', '対象者の詳細要件']::text[], '本ページは公開情報をもとにした概要です。対象要件・支援内容・受付時間・申請方法は変更される場合があるため、利用前に必ず高知市の公式ページまたは高知市生活支援相談センターでご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-livelihood-consultation');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'kochi-kochi-livelihood-consultation' and c.slug = 'livelihood' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-livelihood-consultation');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'kochi-kochi-livelihood-consultation' and le.slug = 'hardship' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'kochi-kochi-livelihood-consultation'
), updated_source as (
  update public.support_sources src
  set
    title = '困窮者自立支援制度について（高知市ホームページ・福祉管理課）',
    publisher = coalesce(src.publisher, 'www.city.kochi.kochi.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '742bc5651701fd5cf58e70a5f59df64642141fcae4224fa91692abdd7f2d3623',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kochi.kochi.jp/soshiki/30/shien2.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kochi.kochi.jp/soshiki/30/shien2.html', '困窮者自立支援制度について（高知市ホームページ・福祉管理課）', 'www.city.kochi.kochi.jp',
  now(), '2026-06-24', '742bc5651701fd5cf58e70a5f59df64642141fcae4224fa91692abdd7f2d3623', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"kochi-kochi-livelihood-consultation","status":"published","title":"生活困窮者自立支援制度（高知市生活支援相談センター・自立相談支援）","officialUrl":"https://www.city.kochi.kochi.jp/soshiki/30/shien2.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"742bc5651701fd5cf58e70a5f59df64642141fcae4224fa91692abdd7f2d3623"}'::jsonb,
  'seed:kochi-kochi-livelihood-consultation:742bc5651701fd5cf58e70a5f59df64642141fcae4224fa91692abdd7f2d3623'
from public.support_programs sp
where sp.slug = 'kochi-kochi-livelihood-consultation'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'okinawa' and m.slug = 'naha'), 'okinawa-naha-livelihood-consultation', '生活困窮者自立支援制度（自立相談支援）', '那覇市が、生活や就労に困りごとを抱える方を対象に、専門の支援員が相談に応じ、自立に向けた支援プランの作成など包括的な支援を行う制度です。窓口は「那覇市 就職・生活支援パーソナルサポートセンター」です。', '仕事やお金、暮らしのことで困っているとき、那覇市の専門の相談員に無料で相談できる窓口です。あなたの状況を一緒に整理し、就労の準備や家計の立て直し、住まいの確保などに向けて、どんな支援が使えるかを一緒に考えてくれます。まずは電話（098-917-5348）で予約してから、窓口で相談できます。ひとりで抱え込まず、相談してみてください。', 'consultation',
  '那覇市内に居住し、失業や休職などの経済的な問題、働くことへの不安（引きこもり・ニートなど）、家族の悩み、生活や就職に関する困りごとを抱えている方が対象となる可能性があります。公式案内では年齢制限はないとされていますが、詳しい対象範囲は公式でご確認ください。', NULL, NULL, NULL,
  '電話（098-917-5348）での事前予約・問い合わせのうえ、窓口での相談となります。窓口は「那覇市 就職・生活支援パーソナルサポートセンター」（那覇市泉崎1丁目20番1号6階／グッジョブセンターおきなわ内）。受付時間は月曜日から金曜日の午前9時から午後4時（正午から午後1時を除く。祝日・慰霊の日・年末年始を除く）とされています。最新の受付方法・時間は公式でご確認ください。', NULL, FALSE,
  '那覇市 福祉部 保護管理課 生活支援グループ（那覇市 就職・生活支援パーソナルサポートセンター）', '098-917-5348', NULL, 'https://www.city.naha.okinawa.jp/fukusi/shakaifukushi/1003447/1003475.html', '生活困窮者自立支援制度｜那覇市公式ホームページ',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'onlineApplicationAvailable', '対象年齢の範囲', '所得制限の有無']::text[], '本ページは公式情報をもとにした概要です。対象範囲・支援内容・受付時間などは変更される場合があるため、必ず那覇市公式ホームページまたは窓口でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-livelihood-consultation');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'okinawa-naha-livelihood-consultation' and c.slug = 'livelihood' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-livelihood-consultation');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'okinawa-naha-livelihood-consultation' and le.slug = 'hardship' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'okinawa-naha-livelihood-consultation'
), updated_source as (
  update public.support_sources src
  set
    title = '生活困窮者自立支援制度｜那覇市公式ホームページ',
    publisher = coalesce(src.publisher, 'www.city.naha.okinawa.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '55edd37e598d97b0485b2cd38f1fbbb804f3541577c5166337cf0f1d5c5ef71d',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.naha.okinawa.jp/fukusi/shakaifukushi/1003447/1003475.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.naha.okinawa.jp/fukusi/shakaifukushi/1003447/1003475.html', '生活困窮者自立支援制度｜那覇市公式ホームページ', 'www.city.naha.okinawa.jp',
  now(), '2026-06-24', '55edd37e598d97b0485b2cd38f1fbbb804f3541577c5166337cf0f1d5c5ef71d', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"okinawa-naha-livelihood-consultation","status":"published","title":"生活困窮者自立支援制度（自立相談支援）","officialUrl":"https://www.city.naha.okinawa.jp/fukusi/shakaifukushi/1003447/1003475.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"55edd37e598d97b0485b2cd38f1fbbb804f3541577c5166337cf0f1d5c5ef71d"}'::jsonb,
  'seed:okinawa-naha-livelihood-consultation:55edd37e598d97b0485b2cd38f1fbbb804f3541577c5166337cf0f1d5c5ef71d'
from public.support_programs sp
where sp.slug = 'okinawa-naha-livelihood-consultation'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'saitama' and m.slug = 'kawagoe'), 'saitama-kawagoe-livelihood-consultation', '川越市自立相談支援センター（生活困窮者自立相談支援）', '生活に困っている方の相談に、専門の支援員が一人ひとりの状況に合わせて寄り添い、支援プランの作成や他の専門機関との連携を通じて自立に向けた支援を行う、川越市の自立相談支援機関です。', 'お金や仕事、住まいのことで生活に困ったとき、川越市の「自立相談支援センター」に相談できます。専門の相談員が話を聞き、その人に合った計画を一緒に考えて、必要な支援や他の窓口につないでくれます。まずは電話（049-293-9413）か窓口で相談してみてください。', 'consultation',
  '生活に困っている、仕事が見つからない、病気で働けない、家賃を払えない、住む所がない、将来が不安、社会に出るのが恐い、といった困りごとを抱える川越市内の方が対象となる可能性があります。各事業ごとに一定の資産・収入に関する要件が設けられている場合があります。具体的な対象範囲は公式でご確認ください。', '相談・支援プラン作成を行う相談支援が中心で、現金給付そのものではありません（住居確保給付金など個別の給付制度は別途案内・要件あり）。', '随時相談を受け付け（期限の定めは公式でご確認ください）。', NULL,
  'まずは電話または窓口で相談します。電話相談は川越市自立相談支援センター（電話 049-293-9413）。窓口は川越市脇田本町8番地1 U_PLACE3階 川越市民サービスステーション11番窓口（月曜日から土曜日、日曜・祝祭日・年末年始を除く、午前9時30分から午後6時15分まで）。相談後、支援員が状況を聞き取り、個別の支援プランを作成して支援につなげます。予約の要否や受付の詳細は公式でご確認ください。', '公式ページに必要書類の明記はありません。相談内容に応じて案内されるため、事前に窓口・電話でご確認ください。', FALSE,
  '川越市 福祉部 生活福祉課（自立相談支援担当）／川越市自立相談支援センター', '049-293-9413', NULL, 'https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006983/1007012.html', '川越市自立相談支援センター｜川越市',
  '2026-06-24', 'high', ARRAY['targetPeople', 'benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'onlineApplicationAvailable']::text[], '対象者・支援内容・必要書類・予約の要否などは変更される場合があります。最新の正確な情報は必ず川越市の公式ページまたは窓口でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-livelihood-consultation');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'saitama-kawagoe-livelihood-consultation' and c.slug = 'livelihood' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-livelihood-consultation');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'saitama-kawagoe-livelihood-consultation' and le.slug = 'hardship' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'saitama-kawagoe-livelihood-consultation'
), updated_source as (
  update public.support_sources src
  set
    title = '川越市自立相談支援センター｜川越市',
    publisher = coalesce(src.publisher, 'www.city.kawagoe.saitama.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '92297f951d38ee183dc592e9bb7f1ea23e0466f9e8dbe96341b953b3a3a3ea97',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006983/1007012.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006983/1007012.html', '川越市自立相談支援センター｜川越市', 'www.city.kawagoe.saitama.jp',
  now(), '2026-06-24', '92297f951d38ee183dc592e9bb7f1ea23e0466f9e8dbe96341b953b3a3a3ea97', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"saitama-kawagoe-livelihood-consultation","status":"published","title":"川越市自立相談支援センター（生活困窮者自立相談支援）","officialUrl":"https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006983/1007012.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"92297f951d38ee183dc592e9bb7f1ea23e0466f9e8dbe96341b953b3a3a3ea97"}'::jsonb,
  'seed:saitama-kawagoe-livelihood-consultation:92297f951d38ee183dc592e9bb7f1ea23e0466f9e8dbe96341b953b3a3a3ea97'
from public.support_programs sp
where sp.slug = 'saitama-kawagoe-livelihood-consultation'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'hiroshima' and m.slug = 'fukuyama'), 'hiroshima-fukuyama-livelihood-consultation', '生活困窮者自立支援制度（自立相談支援事業）', '福山市の生活困窮者自立支援制度の自立相談支援事業です。専門の相談支援員が、経済的・社会的自立に関するさまざまな問題について相談に応じ、情報提供や助言、支援プランの作成などを行うとされています。', '仕事やお金、生活のことで困っているとき、福山市役所1階の窓口で専門の相談員に無料で相談できる制度です。どんな支援が使えるか一緒に考えてもらえます。まずは電話か窓口に問い合わせてみてください。', 'consultation',
  '福山市内に在住で、生活に困窮されている方が対象となる可能性があります。本人だけでなく、ご家族など事情の分かる方からの相談も受け付けているとされています。詳しい対象や利用要件は公式ページや窓口でご確認ください。', '自立相談支援事業は相談支援が中心で、この事業そのものの給付額は示されていません。なお、就労支援・家計改善支援・住居確保給付金などの関連支援が制度内にありますが、各支援の金額や要件は本ページでは明示されていないため、公式でご確認ください。', '申請期限についての記載は確認できませんでした。随時相談を受け付けているとみられますが、詳細は公式でご確認ください。', NULL,
  '原則として受付窓口（福山市役所1階「生活困窮者自立支援センター すまいる・ねっと・ワーク福山」）へ直接来所して相談するとされています。来所が難しい場合は電話連絡や、事情の分かる方の来所でも対応可能と案内されています。相談は無料とされています。', '必要書類についての具体的な記載は公式ページで確認できませんでした。窓口にお問い合わせください。', FALSE,
  '福山市 生活福祉課／生活困窮者自立支援センター「すまいる・ねっと・ワーク福山」', '084-928-1241', NULL, 'https://www.city.fukuyama.hiroshima.jp/soshiki/seikatsufukushi/221005.html', '生活困窮者自立支援制度 - 福山市ホームページ',
  '2026-06-24', 'high', ARRAY['targetPeople', 'benefitAmountText', 'requiredDocumentsText', 'applicationDeadlineText']::text[], '本ページは公式情報をもとにした概要です。対象要件・支援内容・受付方法などは変更される場合があるため、利用前に必ず福山市の公式ページまたは窓口でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-livelihood-consultation');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'hiroshima-fukuyama-livelihood-consultation' and c.slug = 'livelihood' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-livelihood-consultation');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'hiroshima-fukuyama-livelihood-consultation' and le.slug = 'hardship' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'hiroshima-fukuyama-livelihood-consultation'
), updated_source as (
  update public.support_sources src
  set
    title = '生活困窮者自立支援制度 - 福山市ホームページ',
    publisher = coalesce(src.publisher, 'www.city.fukuyama.hiroshima.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '027d9fdf52db2b65d767b87d2bb44a7d9df1d52d1fe3bd27ba784e402a5f3477',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.fukuyama.hiroshima.jp/soshiki/seikatsufukushi/221005.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.fukuyama.hiroshima.jp/soshiki/seikatsufukushi/221005.html', '生活困窮者自立支援制度 - 福山市ホームページ', 'www.city.fukuyama.hiroshima.jp',
  now(), '2026-06-24', '027d9fdf52db2b65d767b87d2bb44a7d9df1d52d1fe3bd27ba784e402a5f3477', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"hiroshima-fukuyama-livelihood-consultation","status":"published","title":"生活困窮者自立支援制度（自立相談支援事業）","officialUrl":"https://www.city.fukuyama.hiroshima.jp/soshiki/seikatsufukushi/221005.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"027d9fdf52db2b65d767b87d2bb44a7d9df1d52d1fe3bd27ba784e402a5f3477"}'::jsonb,
  'seed:hiroshima-fukuyama-livelihood-consultation:027d9fdf52db2b65d767b87d2bb44a7d9df1d52d1fe3bd27ba784e402a5f3477'
from public.support_programs sp
where sp.slug = 'hiroshima-fukuyama-livelihood-consultation'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'aichi' and m.slug = 'toyohashi'), 'aichi-toyohashi-livelihood-consultation', '生活困窮者自立相談支援事業（自立相談支援機関）', '豊橋市の生活困窮者自立支援制度に基づく自立相談支援事業の窓口です。生活や仕事の困りごとについて相談を受け、内容に応じて支援を検討し、必要に応じて支援プランを作成して自立に向けたサポートにつなぐ取り組みとされています。', 'お金や仕事、生活のことで困っているとき、豊橋市の窓口で相談できる制度です。相談員が話を聞いて、その人に合った支援を一緒に考え、必要なときは支援の計画を作ってくれます。まずは生活福祉課（電話 0532-51-2313）に相談してみてください。', 'consultation',
  '経済的な困りごとや生活・仕事の悩みを抱える方が対象となる可能性があります。具体的な対象範囲や要件は市の窓口でご確認ください。', '自立相談支援事業は相談・支援プラン作成を中心とする相談支援です。金銭給付の有無や金額は本事業の対象外/未確認のため、公式でご確認ください。', '公式ページに明確な申込期限の記載は確認できませんでした。詳細は窓口でご確認ください。', NULL,
  '福祉部 生活福祉課（豊橋市役所 東館1階）が相談・申込の窓口とされています。来所や電話での相談が想定されますが、具体的な相談・申込方法は公式ページや窓口でご確認ください。', '必要書類は公式ページで確認できませんでした。相談内容に応じて異なる可能性があるため、窓口でご確認ください。', FALSE,
  '豊橋市 福祉部 生活福祉課', '0532-51-2313', NULL, 'https://www.city.toyohashi.lg.jp/18234.htm', '生活困窮者支援 - 豊橋市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'requiredDocumentsText', 'targetPeople', 'onlineApplicationAvailable']::text[], '本内容は豊橋市の公式ページ（生活困窮者支援）に基づく概要です。対象者・支援内容・相談方法などは変更される場合があり、また本ページでは確認できない事項もあります。最新かつ正確な情報は必ず豊橋市 生活福祉課または公式サイトでご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-livelihood-consultation');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'aichi-toyohashi-livelihood-consultation' and c.slug = 'livelihood' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-livelihood-consultation');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'aichi-toyohashi-livelihood-consultation' and le.slug = 'hardship' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'aichi-toyohashi-livelihood-consultation'
), updated_source as (
  update public.support_sources src
  set
    title = '生活困窮者支援 - 豊橋市',
    publisher = coalesce(src.publisher, 'www.city.toyohashi.lg.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '40e5fba81b4cd9ae92d199f7a766ea05a9d90472693601277882fb2351f724f6',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.toyohashi.lg.jp/18234.htm'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.toyohashi.lg.jp/18234.htm', '生活困窮者支援 - 豊橋市', 'www.city.toyohashi.lg.jp',
  now(), '2026-06-24', '40e5fba81b4cd9ae92d199f7a766ea05a9d90472693601277882fb2351f724f6', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"aichi-toyohashi-livelihood-consultation","status":"published","title":"生活困窮者自立相談支援事業（自立相談支援機関）","officialUrl":"https://www.city.toyohashi.lg.jp/18234.htm","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"40e5fba81b4cd9ae92d199f7a766ea05a9d90472693601277882fb2351f724f6"}'::jsonb,
  'seed:aichi-toyohashi-livelihood-consultation:40e5fba81b4cd9ae92d199f7a766ea05a9d90472693601277882fb2351f724f6'
from public.support_programs sp
where sp.slug = 'aichi-toyohashi-livelihood-consultation'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'kochi' and m.slug = 'kochi'), 'kochi-kochi-physical-disability-certificate', '身体障害者手帳', '高知市が交付する身体障害者手帳の案内ページです。身体に一定以上の永続する障害がある方を対象に、障害の程度に応じて1級から6級の区分で交付される可能性があります。具体的な等級判定・対象範囲・各種サービスの内容は公式でご確認ください。', '体に障害がある方が申し込める「身体障害者手帳」の案内ページです。お医者さんの診断書などを持って高知市の窓口で申請すると、障害の程度に応じて手帳が交付されることがあります。受けられるサービスや対象になるかどうかは、市の公式ページや窓口で確認してください。', 'service',
  '肢体不自由、視覚、聴覚または平衡機能、音声・言語またはそしゃく機能、心臓、じん臓、呼吸器、ぼうこうまたは直腸、小腸、肝臓、免疫機能などに一定以上の永続する障害があると認められる方が対象となる可能性があります。該当の有無や等級は指定医の診断書をもとに審査されるため、対象となるかどうかは公式・窓口でご確認ください。', '手帳の交付により受けられるサービスや割引・助成の内容・金額は障害種別や等級によって異なります。具体的な内容は公式でご確認ください。', '随時受付（明確な申請期限の記載は確認できませんでした。詳細は公式でご確認ください）。', NULL,
  '高知市役所障がい福祉課、障害者福祉センター、東部健康福祉センター、南部健康福祉センター、春野あじさい会館の窓口で申請します（窓口申請）。', '身体障害者手帳交付申請書（新規）または再交付申請書、指定医作成の所定様式の診断書（有効期間は診断日から6か月）、写真2枚（縦4cm×横3cm、撮影後1年以内）、本人確認書類、身体障害者手帳申請時確認票など。最新の必要書類・様式は公式でご確認ください。', FALSE,
  '高知市 健康福祉部 障がい福祉課 管理担当', '088-823-9056', NULL, 'https://www.city.kochi.kochi.jp/soshiki/29/sintai-tetyou.html', '身体障害者手帳について - 高知市ホームページ（障がい福祉課）',
  '2026-06-24', 'high', ARRAY['対象となる障害の範囲・等級判定の詳細', '所得制限の有無', '手帳取得で受けられるサービス・割引・助成の具体的内容と金額', '自己負担の有無', '明確な申請期限', 'オンライン申請の可否（公式上は窓口申請の記載）']::text[], '本ページは高知市公式サイトの情報をもとにした概要です。対象の可否・等級・必要書類・受けられるサービス等は変更される場合があり、また個別の事情により異なります。必ず高知市障がい福祉課または公式ページで最新情報をご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-physical-disability-certificate');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'kochi-kochi-physical-disability-certificate' and c.slug = 'disability' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'kochi-kochi-physical-disability-certificate');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'kochi-kochi-physical-disability-certificate' and le.slug = 'disability' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'kochi-kochi-physical-disability-certificate'
), updated_source as (
  update public.support_sources src
  set
    title = '身体障害者手帳について - 高知市ホームページ（障がい福祉課）',
    publisher = coalesce(src.publisher, 'www.city.kochi.kochi.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '44e9184d9fc0814d6b8065144e2d6b034f4814c470eff65a486ed06cf89d3dc3',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kochi.kochi.jp/soshiki/29/sintai-tetyou.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kochi.kochi.jp/soshiki/29/sintai-tetyou.html', '身体障害者手帳について - 高知市ホームページ（障がい福祉課）', 'www.city.kochi.kochi.jp',
  now(), '2026-06-24', '44e9184d9fc0814d6b8065144e2d6b034f4814c470eff65a486ed06cf89d3dc3', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"kochi-kochi-physical-disability-certificate","status":"published","title":"身体障害者手帳","officialUrl":"https://www.city.kochi.kochi.jp/soshiki/29/sintai-tetyou.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"44e9184d9fc0814d6b8065144e2d6b034f4814c470eff65a486ed06cf89d3dc3"}'::jsonb,
  'seed:kochi-kochi-physical-disability-certificate:44e9184d9fc0814d6b8065144e2d6b034f4814c470eff65a486ed06cf89d3dc3'
from public.support_programs sp
where sp.slug = 'kochi-kochi-physical-disability-certificate'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'okinawa' and m.slug = 'naha'), 'okinawa-naha-physical-disability-certificate', '身体障害者手帳（那覇市）', '那覇市が交付する、身体に障がいのある方が福祉サービスを受けるために必要な手帳です。障がいの程度に応じて1級～6級が認定される場合があります。詳細・最新の要件は公式でご確認ください。', '身体障害者手帳は、那覇市が交付する、体に障がいのある方が福祉サービスを受けるために使う手帳です。障がいの程度によって1級から6級まであります。申請には、お医者さんの診断書・意見書、顔写真、本人確認書類などが必要です。那覇市役所の障がい福祉課の窓口で申請します。自分が対象になるか、必要なものの最新情報は、市の公式ページや窓口で確認してください。', 'service',
  '那覇市にお住まいで、視覚・聴覚・平衡機能・音声言語そしゃく機能・肢体不自由・心臓・じん臓・呼吸器・ぼうこう・直腸・小腸・免疫・肝臓などの機能に一定の障がいがある方が、対象となる可能性があります。該当の有無や等級は指定医の診断書等に基づく審査で判断されるため、ご自身が対象かどうかは公式・窓口でご確認ください。', '手帳自体の交付に関する金額・自己負担や所得制限の記載は公式ページに見当たりません。手帳に基づき受けられる各種福祉サービスの内容や負担は制度ごとに異なるため、公式・窓口でご確認ください。', '特段の申請期限の記載は公式ページに見当たりません。最新の取り扱いは公式・窓口でご確認ください。', NULL,
  '那覇市役所 福祉部 障がい福祉課（給付1グループ）の窓口で申請します。新規申請時は、指定医による診断書・意見書、顔写真（縦4cm×横3cm、撮影1年以内）、個人番号確認書類、身分証明書、交付申請書が必要とされています。診断書は作成日から3カ月以内のものが必要とされ、手帳交付は申請後約2カ月後となる場合があります。郵送による申請については電話での問い合わせが案内されています。オンライン申請の可否は公式に明示がないため、窓口にご確認ください。', '新規申請時：診断書・意見書（指定医によるもの、作成日から3カ月以内）、顔写真（縦4cm×横3cm、撮影1年以内）、個人番号確認書類、身分証明書、交付申請書。最新の様式・要件は公式でご確認ください。', FALSE,
  '那覇市 福祉部 障がい福祉課 給付1グループ', '098-862-3275', NULL, 'https://www.city.naha.okinawa.jp/fukusi/syougai/syougaitecyou/sintaitetyou.html', '身体障害者手帳｜那覇市公式ホームページ',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'onlineApplicationAvailable', 'requiredDocumentsText', '対象年齢・所得制限・自己負担の有無']::text[], '本ページは公式情報をもとにした概要です。対象の可否・等級・必要書類・取り扱いは変更される場合があり、審査により判断されます。最新かつ正確な内容は那覇市の公式ページおよび窓口でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-physical-disability-certificate');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'okinawa-naha-physical-disability-certificate' and c.slug = 'disability' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'okinawa-naha-physical-disability-certificate');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'okinawa-naha-physical-disability-certificate' and le.slug = 'disability' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'okinawa-naha-physical-disability-certificate'
), updated_source as (
  update public.support_sources src
  set
    title = '身体障害者手帳｜那覇市公式ホームページ',
    publisher = coalesce(src.publisher, 'www.city.naha.okinawa.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '53f641b0491f140151d5944dd485c73faa261187df560baecc42fa767407c8d1',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.naha.okinawa.jp/fukusi/syougai/syougaitecyou/sintaitetyou.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.naha.okinawa.jp/fukusi/syougai/syougaitecyou/sintaitetyou.html', '身体障害者手帳｜那覇市公式ホームページ', 'www.city.naha.okinawa.jp',
  now(), '2026-06-24', '53f641b0491f140151d5944dd485c73faa261187df560baecc42fa767407c8d1', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"okinawa-naha-physical-disability-certificate","status":"published","title":"身体障害者手帳（那覇市）","officialUrl":"https://www.city.naha.okinawa.jp/fukusi/syougai/syougaitecyou/sintaitetyou.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"53f641b0491f140151d5944dd485c73faa261187df560baecc42fa767407c8d1"}'::jsonb,
  'seed:okinawa-naha-physical-disability-certificate:53f641b0491f140151d5944dd485c73faa261187df560baecc42fa767407c8d1'
from public.support_programs sp
where sp.slug = 'okinawa-naha-physical-disability-certificate'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'saitama' and m.slug = 'kawagoe'), 'saitama-kawagoe-physical-disability-certificate', '身体障害者手帳の手続き（川越市）', '身体障害者手帳は、身体に障害のあるかたが各種制度やサービスを利用するために必要な手帳とされています。川越市では障害者福祉課が交付申請の窓口とされています。等級や対象範囲などの詳細は公式での確認が必要です。', '身体障害者手帳は、体に障害のある方が、いろいろな制度やサービスを使うために役立つ手帳です。川越市では「障害者福祉課」の窓口で申し込みます。申し込みには、医師が書いた診断書・意見書（市の決まった様式）、マイナンバーと本人確認の書類、本人の顔写真2枚などが必要とされています。手帳が届くまでは、だいたい1か月半ほどかかると案内されています。等級（1級〜6級）の判定や、もらえるかどうかは審査によります。くわしいことは、必ず川越市の公式ページで確認してください。', 'service',
  '身体に永続する障害があるかたが対象となる可能性があります。障害区分ごとに認定基準があり、障害の程度に応じて1級から6級に区分されるとされています。具体的な対象や認定基準は公式で確認してください。', '手帳自体の交付に金額の定めはありません。手帳に付随する各種割引・助成の内容や金額は制度・所得等により異なるため、公式で確認してください。', NULL, NULL,
  '川越市の案内によると、障害者福祉課の窓口で必要書類を添えて申請する方式とされています。', '川越市の新規申請の案内では、身体障害者診断書・意見書（市指定様式、原則診断から3か月以内）、マイナンバー（個人番号）および身元確認書類、本人の顔写真2枚（縦4センチ×横3センチ）などが挙げられています。あわせて診断書料補助金申請書・預金通帳の案内もあります。最新・正確な必要書類は公式で確認してください。', FALSE,
  '川越市 福祉部 障害者福祉課', '049-224-5785', NULL, 'https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006736/1006738/1006739.html', '身体障害者手帳の手続き｜川越市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'onlineApplicationAvailable', '対象等級・認定基準の詳細', '再認定・更新の要否', '所得制限の有無']::text[], '本ページは川越市公式サイトの情報をもとにした概要です。対象・等級・必要書類・所要期間などは変更される場合があり、個別の判定は審査によります。申請の可否や詳細は必ず川越市障害者福祉課・公式ページでご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-physical-disability-certificate');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'saitama-kawagoe-physical-disability-certificate' and c.slug = 'disability' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'saitama-kawagoe-physical-disability-certificate');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'saitama-kawagoe-physical-disability-certificate' and le.slug = 'disability' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'saitama-kawagoe-physical-disability-certificate'
), updated_source as (
  update public.support_sources src
  set
    title = '身体障害者手帳の手続き｜川越市',
    publisher = coalesce(src.publisher, 'www.city.kawagoe.saitama.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '37082166c9e31c09434cd034b917dbfade9a89d4d2f1213799e6c65f59600ed8',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006736/1006738/1006739.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006736/1006738/1006739.html', '身体障害者手帳の手続き｜川越市', 'www.city.kawagoe.saitama.jp',
  now(), '2026-06-24', '37082166c9e31c09434cd034b917dbfade9a89d4d2f1213799e6c65f59600ed8', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"saitama-kawagoe-physical-disability-certificate","status":"published","title":"身体障害者手帳の手続き（川越市）","officialUrl":"https://www.city.kawagoe.saitama.jp/kenko/fukushi/1006736/1006738/1006739.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"37082166c9e31c09434cd034b917dbfade9a89d4d2f1213799e6c65f59600ed8"}'::jsonb,
  'seed:saitama-kawagoe-physical-disability-certificate:37082166c9e31c09434cd034b917dbfade9a89d4d2f1213799e6c65f59600ed8'
from public.support_programs sp
where sp.slug = 'saitama-kawagoe-physical-disability-certificate'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'hiroshima' and m.slug = 'fukuyama'), 'hiroshima-fukuyama-physical-disability-certificate', '身体障がい者手帳', '福山市では、身体に一定の障がいがある人を対象に「身体障がい者手帳」の交付を案内しています。視覚・聴覚・肢体・内部障がいなどが対象となる可能性があり、各種の福祉サービスや支援を利用する際の基礎となる手帳です。対象範囲・等級の判定は指定医師の診断書等に基づくため、詳細は公式で確認してください。', 'からだに一定の障がいがある人が申し込める「身体障がい者手帳」です。視覚・聴覚・手足・内臓などの障がいが対象になることがあります。申し込みには、申請書・お医者さん（指定医師）の診断書・写真2枚・本人確認書類・マイナンバーがいります。福山市の障がい福祉課や各保健福祉課の窓口、または郵送で申し込めます。自分が対象になるか、必要なものは、市の公式ページで確かめてください。', 'service',
  '視覚、聴覚・平衡機能、音声・言語・そしゃく機能、肢体、心臓、腎臓、肝臓、呼吸器、ぼうこう・直腸、小腸、ヒト免疫不全ウイルスによる免疫機能などに障がいがある人で、身体障害者福祉法に定める一定の状態に該当する可能性がある人。対象に該当するかは指定医師の診断書等に基づき判定されるため、公式で確認してください。', '手帳の交付自体に金額の概念はありません。手帳に基づいて受けられる各種サービスや割引等の内容・自己負担は制度ごとに異なるため、公式で確認してください。', '随時受付（申請期限の記載は確認できませんでした）。詳細は公式で確認してください。', NULL,
  '障がい福祉課または各保健福祉課、各支所保健福祉担当の窓口で申請できます。郵送による申請は障がい福祉課で受け付けています。オンライン申請の案内は確認できませんでした。詳細は公式で確認してください。', '新規申請の場合：申請書、指定医師の診断書、写真2枚（たて4cm×よこ3cm）、本人確認書類、個人番号（マイナンバー）関連書類。再交付（紛失・破損）時は診断書が不要な場合があり、等級変更時は診断書が必要とされています。手続きや状況により異なるため、公式で確認してください。', FALSE,
  '福山市 障がい福祉課', '084-928-1063', NULL, 'https://www.city.fukuyama.hiroshima.jp/soshiki/shogaifukushi/244511.html', '身体障がい者手帳 - 福山市ホームページ',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'onlineApplicationAvailable', 'targetPeople', 'requiredDocumentsText']::text[], '本情報は福山市公式サイトの「身体障がい者手帳」案内ページ（2026年6月時点）に基づく概要です。対象範囲・等級判定・必要書類・手続きは変更される場合があり、個別の該当可否は指定医師の診断書等に基づき判定されます。必ず福山市の公式ページおよび障がい福祉課で最新情報をご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-physical-disability-certificate');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'hiroshima-fukuyama-physical-disability-certificate' and c.slug = 'disability' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'hiroshima-fukuyama-physical-disability-certificate');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'hiroshima-fukuyama-physical-disability-certificate' and le.slug = 'disability' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'hiroshima-fukuyama-physical-disability-certificate'
), updated_source as (
  update public.support_sources src
  set
    title = '身体障がい者手帳 - 福山市ホームページ',
    publisher = coalesce(src.publisher, 'www.city.fukuyama.hiroshima.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = 'bd5de5df7b3c10648a7d4df19d071e23f9e6c98e6b6f5cedd79cac7879a688bb',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.fukuyama.hiroshima.jp/soshiki/shogaifukushi/244511.html'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.fukuyama.hiroshima.jp/soshiki/shogaifukushi/244511.html', '身体障がい者手帳 - 福山市ホームページ', 'www.city.fukuyama.hiroshima.jp',
  now(), '2026-06-24', 'bd5de5df7b3c10648a7d4df19d071e23f9e6c98e6b6f5cedd79cac7879a688bb', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"hiroshima-fukuyama-physical-disability-certificate","status":"published","title":"身体障がい者手帳","officialUrl":"https://www.city.fukuyama.hiroshima.jp/soshiki/shogaifukushi/244511.html","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"bd5de5df7b3c10648a7d4df19d071e23f9e6c98e6b6f5cedd79cac7879a688bb"}'::jsonb,
  'seed:hiroshima-fukuyama-physical-disability-certificate:bd5de5df7b3c10648a7d4df19d071e23f9e6c98e6b6f5cedd79cac7879a688bb'
from public.support_programs sp
where sp.slug = 'hiroshima-fukuyama-physical-disability-certificate'
on conflict (external_key) where external_key is not null do nothing;

insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  (select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = 'aichi' and m.slug = 'toyohashi'), 'aichi-toyohashi-physical-disability-certificate', '身体障害者手帳（豊橋市）', '豊橋市が案内する身体障害者手帳の制度。視覚・聴覚・肢体不自由・内部障害などで一定以上の状態に該当する場合に交付の対象となる可能性があり、各種の福祉サービスを利用する際の基礎となる手帳です。等級や対象の判定は指定医師の診断と審査によります。', '体に障害がある方のための手帳です。視覚・聴覚・手足・心臓や腎臓などの内部障害などが対象になることがあります。市役所の障害福祉課でもらえる用紙で指定の医師の診断を受けてから、窓口で申請します。手帳がもらえるかどうかや等級は診断と審査で決まるので、まずは障害福祉課に相談してください。', 'service',
  '視覚、聴覚・平衡機能、音声・言語・そしゃく機能、肢体不自由（上肢・下肢・体幹・脳原性）、心臓・腎臓・呼吸器・膀胱・直腸・小腸・肝臓・免疫などの内部障害があり、その障害が一定以上で永続すると認められる方が交付の対象となる可能性があります。該当の有無や等級（1〜6級など）は指定医師の診断と審査により決まるため、公式での確認が必要です。', '手帳の交付自体に給付金額の定めはありません。手帳に基づいて利用できる手当・減免・サービスの内容や金額は制度ごと・等級ごとに異なり、本ページ単独では確定しません。各支援制度の金額は公式でご確認ください。', '申請の受付期限についての定めは確認できませんでした。交付までは申請からおよそ1か月が目安とされていますが、詳細は障害福祉課でご確認ください。', NULL,
  '障害福祉課（市役所東館1階11番窓口）で専用の診断書・意見書用紙を受け取り（市ホームページからダウンロードも可）、15条指定医師の診断を受けたうえで、申請書・診断書・本人確認書類・証明写真・マイナンバーのわかるもの等を持参して同窓口で申請します。窓口センター等では手続きできません。交付までの期間は申請からおよそ1か月が目安とされています。郵送やオンライン対応の可否は公式・担当課でご確認ください。', '申請書、所定様式の診断書・意見書（15条指定医師作成）、本人確認書類、証明写真（たて4cm×よこ3cm）、マイナンバーのわかるもの等が案内されています。追加書類の有無は公式・担当課でご確認ください。', FALSE,
  '豊橋市役所 福祉部 障害福祉課', '0532-51-2345', NULL, 'https://www.city.toyohashi.lg.jp/6496.htm', '身体障害者手帳について - 豊橋市',
  '2026-06-24', 'high', ARRAY['benefitAmountText', 'applicationDeadlineText', 'onlineApplicationAvailable', '対象等級の詳細', '所得制限', '交付までの期間', '郵送申請の可否']::text[], '対象・等級・必要書類・交付までの期間などは変更される場合があり、最終的な可否は診断と審査によります。詳細は必ず豊橋市の公式ページおよび障害福祉課でご確認ください。',
  'published', now(), coalesce('2026-06-24', now())
)
on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;
delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-physical-disability-certificate');
insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = 'aichi-toyohashi-physical-disability-certificate' and c.slug = 'disability' on conflict do nothing;
delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = 'aichi-toyohashi-physical-disability-certificate');
insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = 'aichi-toyohashi-physical-disability-certificate' and le.slug = 'disability' on conflict do nothing;
with target_program as (
  select id from public.support_programs where slug = 'aichi-toyohashi-physical-disability-certificate'
), updated_source as (
  update public.support_sources src
  set
    title = '身体障害者手帳について - 豊橋市',
    publisher = coalesce(src.publisher, 'www.city.toyohashi.lg.jp'),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = '2026-06-24',
    content_hash = '7c57951db07efb09c5da1c4591cf0bed7ff65fc2b7bfcb4a8ec4c800793b34c6',
    notes = 'seed export baseline',
    source_kind = 'official',
    quality_state = 'ok',
    detected_issue_codes = '{}'::text[],
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = 'https://www.city.toyohashi.lg.jp/6496.htm'
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, 'https://www.city.toyohashi.lg.jp/6496.htm', '身体障害者手帳について - 豊橋市', 'www.city.toyohashi.lg.jp',
  now(), '2026-06-24', '7c57951db07efb09c5da1c4591cf0bed7ff65fc2b7bfcb4a8ec4c800793b34c6', 'seed export baseline',
  'official', 'ok', '{}'::text[], 90
from target_program tp
where not exists (select 1 from updated_source);
insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  'seed baseline import',
  '{"slug":"aichi-toyohashi-physical-disability-certificate","status":"published","title":"身体障害者手帳（豊橋市）","officialUrl":"https://www.city.toyohashi.lg.jp/6496.htm","lastOfficialCheckedAt":"2026-06-24","sourceConfidence":"high","contentHash":"7c57951db07efb09c5da1c4591cf0bed7ff65fc2b7bfcb4a8ec4c800793b34c6"}'::jsonb,
  'seed:aichi-toyohashi-physical-disability-certificate:7c57951db07efb09c5da1c4591cf0bed7ff65fc2b7bfcb4a8ec4c800793b34c6'
from public.support_programs sp
where sp.slug = 'aichi-toyohashi-physical-disability-certificate'
on conflict (external_key) where external_key is not null do nothing;
