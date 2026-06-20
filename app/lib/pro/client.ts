/**
 * Pro（相談支援現場向け）のデータアクセス（ブラウザ Supabase + 組織RLS）。
 * 認可は DB の RLS（private.is_org_member / is_org_admin）が最終境界。
 * 相談パックには相談者の機微情報を入れない運用（UI 文言で明示）。
 */
import { getSupabase } from "@/app/lib/supabase";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase 未設定（Pro はログインが必要です）");
  return sb;
}

export interface Organization {
  id: string;
  name: string;
  organizationType: string;
  plan: string;
  role: string; // 自分の役割
}

export interface Packet {
  id: string;
  organizationId: string;
  title: string;
  prefectureSlug?: string | null;
  municipalitySlug?: string | null;
  selectedProgramSlugs: string[];
  notes?: string | null;
  status: string;
  updatedAt?: string | null;
}

/** 相談パックの印刷・候補表示に使う公開制度（PrepProgram 互換）。 */
export interface ProProgram {
  slug: string;
  title: string;
  municipalityName: string;
  prefectureSlug: string;
  municipalitySlug: string;
  targetPeople: string;
  deadlineText?: string;
  documentsText?: string;
  methodText: string;
  online: boolean;
  officeName?: string;
  phone?: string;
  officialUrl: string;
}

const PROGRAM_SELECT = `
  slug, title, target_people, application_deadline_text, required_documents_text,
  application_method_text, online_application_available, contact_name, contact_phone,
  official_url,
  municipality:municipalities!inner ( slug, name, prefecture:prefectures!inner ( slug ) )
`;

type ProgramRow = {
  slug: string;
  title: string;
  target_people: string;
  application_deadline_text: string | null;
  required_documents_text: string | null;
  application_method_text: string;
  online_application_available: boolean | null;
  contact_name: string | null;
  contact_phone: string | null;
  official_url: string;
  municipality: {
    slug: string;
    name: string;
    prefecture: { slug: string } | null;
  } | null;
};

function mapProgram(r: ProgramRow): ProProgram | null {
  if (!r.municipality?.slug || !r.municipality.prefecture?.slug) return null;
  return {
    slug: r.slug,
    title: r.title,
    municipalityName: r.municipality.name,
    prefectureSlug: r.municipality.prefecture.slug,
    municipalitySlug: r.municipality.slug,
    targetPeople: r.target_people,
    deadlineText: r.application_deadline_text ?? undefined,
    documentsText: r.required_documents_text ?? undefined,
    methodText: r.application_method_text,
    online: Boolean(r.online_application_available),
    officeName: r.contact_name ?? undefined,
    phone: r.contact_phone ?? undefined,
    officialUrl: r.official_url,
  };
}

// ---- 組織 -----------------------------------------------------------------
export async function getMyOrganizations(): Promise<Organization[]> {
  const sb = client();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await sb
    .from("organization_members")
    .select("role, organizations!inner ( id, name, organization_type, plan )")
    .eq("user_id", auth.user.id);
  if (error) throw new Error(error.message);
  type Row = {
    role: string;
    organizations: {
      id: string;
      name: string;
      organization_type: string;
      plan: string;
    } | null;
  };
  return (data as unknown as Row[])
    .filter((r) => r.organizations)
    .map((r) => ({
      id: r.organizations!.id,
      name: r.organizations!.name,
      organizationType: r.organizations!.organization_type,
      plan: r.organizations!.plan,
      role: r.role,
    }));
}

export async function createOrganization(
  name: string,
  type: string,
): Promise<string> {
  const { data, error } = await client().rpc("create_organization", {
    p_name: name,
    p_type: type,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// ---- 相談パック ------------------------------------------------------------
type PacketRow = {
  id: string;
  organization_id: string;
  title: string;
  prefecture_slug: string | null;
  municipality_slug: string | null;
  selected_program_slugs: string[] | null;
  notes: string | null;
  status: string;
  updated_at: string | null;
};

function mapPacket(r: PacketRow): Packet {
  return {
    id: r.id,
    organizationId: r.organization_id,
    title: r.title,
    prefectureSlug: r.prefecture_slug,
    municipalitySlug: r.municipality_slug,
    selectedProgramSlugs: r.selected_program_slugs ?? [],
    notes: r.notes,
    status: r.status,
    updatedAt: r.updated_at,
  };
}

export async function listPackets(organizationId: string): Promise<Packet[]> {
  const { data, error } = await client()
    .from("consultation_packets")
    .select(
      "id, organization_id, title, prefecture_slug, municipality_slug, selected_program_slugs, notes, status, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as PacketRow[]).map(mapPacket);
}

export async function createPacket(
  organizationId: string,
  title: string,
): Promise<string> {
  const sb = client();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { data, error } = await sb
    .from("consultation_packets")
    .insert({
      organization_id: organizationId,
      created_by: auth.user.id,
      title,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function getPacket(id: string): Promise<Packet | null> {
  const { data, error } = await client()
    .from("consultation_packets")
    .select(
      "id, organization_id, title, prefecture_slug, municipality_slug, selected_program_slugs, notes, status, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPacket(data as unknown as PacketRow) : null;
}

export async function updatePacket(
  id: string,
  patch: Partial<{
    title: string;
    notes: string | null;
    selected_program_slugs: string[];
    status: string;
  }>,
): Promise<void> {
  const { error } = await client()
    .from("consultation_packets")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---- 公開制度の検索（パックに入れる制度を探す） --------------------------
export async function searchPublished(
  q: string,
  limit = 30,
): Promise<ProProgram[]> {
  let query = client()
    .from("support_programs")
    .select(PROGRAM_SELECT)
    .eq("status", "published")
    .limit(limit);
  if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as ProgramRow[])
    .map(mapProgram)
    .filter((p): p is ProProgram => p !== null);
}

/** 指定 slug 群の公開制度をまとめて取得（パック印刷用）。 */
export async function getProgramsBySlugs(
  slugs: string[],
): Promise<ProProgram[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await client()
    .from("support_programs")
    .select(PROGRAM_SELECT)
    .eq("status", "published")
    .in("slug", slugs);
  if (error) throw new Error(error.message);
  const map = new Map<string, ProProgram>();
  for (const r of data as unknown as ProgramRow[]) {
    const p = mapProgram(r);
    if (p) map.set(p.slug, p);
  }
  // 選択順を保つ。
  return slugs.map((s) => map.get(s)).filter((p): p is ProProgram => Boolean(p));
}
