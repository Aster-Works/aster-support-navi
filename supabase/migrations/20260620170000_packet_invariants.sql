-- Slice E 修正（レビュー指摘）: consultation_packets の created_by / organization_id を
-- DB レベルで不変にする。
--
-- RLS は行アクセスは守るが列値は制限しないため、組織メンバーが REST API を直接叩いて
-- created_by を他人の uuid にすり替えたり、organization_id を別組織へ移動できる余地があった
-- （監査・帰属の整合性が壊れる）。トリガで固定する。
--   - INSERT: created_by は必ず auth.uid()（クライアント値を無視）
--   - UPDATE: created_by / organization_id は変更不可（旧値を保持）

create or replace function public.enforce_packet_invariants()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.organization_id := old.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_packet_invariants_trg on public.consultation_packets;
create trigger enforce_packet_invariants_trg
  before insert or update on public.consultation_packets
  for each row execute function public.enforce_packet_invariants();
