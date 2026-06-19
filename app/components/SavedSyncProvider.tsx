"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/app/lib/supabase";
import {
  loadSaved,
  persistSaved,
  SAVED_CHANGED_EVENT,
  type SavedItem,
} from "@/app/lib/saved";

type Status = "loading" | "anon" | "signedin";

interface SavedSyncValue {
  status: Status;
  email: string | null;
  /** クラウド同期が使えるか（env 設定済み）。 */
  enabled: boolean;
  /** メール（ID）＋パスワードでログイン。 */
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** メール（ID）＋パスワードで新規登録（メール確認オフなら即ログイン）。 */
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }>;
  /** Google アカウントでログイン（OAuth リダイレクト）。 */
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SavedSyncValue | null>(null);

/** 保存リストの「ログインして複数端末で同期」を提供する。未ログイン時は何もせず localStorage のまま。 */
export function useSavedSync(): SavedSyncValue {
  return (
    useContext(Ctx) ?? {
      status: "anon",
      email: null,
      enabled: false,
      signIn: async () => ({ ok: false, error: "未対応" }),
      signUp: async () => ({ ok: false, error: "未対応" }),
      signInWithGoogle: async () => ({ ok: false, error: "未対応" }),
      signOut: async () => {},
    }
  );
}

function toRow(userId: string, it: SavedItem) {
  return {
    user_id: userId,
    program_slug: it.slug,
    program_title: it.title,
    municipality_slug: it.municipalitySlug ?? null,
    snapshot: it as unknown as Record<string, unknown>,
  };
}

export function SavedSyncProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [status, setStatus] = useState<Status>(supabase ? "loading" : "anon");
  const [email, setEmail] = useState<string | null>(null);
  // 初回のリモート取り込み（pull+merge）が済むまで reconcile（削除を含む push）を行わない。
  const syncedRef = useRef(false);
  const userRef = useRef<User | null>(null);

  // ローカル＋リモートを union し、ローカルに反映してからリモートへ揃える。
  const pullAndMerge = useCallback(
    async (client: SupabaseClient, user: User) => {
      syncedRef.current = false;
      const local = loadSaved();
      const { data } = await client
        .from("saved_programs")
        .select("snapshot")
        .eq("user_id", user.id);
      const remote = (data ?? [])
        .map((r) => r.snapshot as SavedItem | null)
        .filter((x): x is SavedItem => Boolean(x && x.slug));
      const map = new Map<string, SavedItem>();
      for (const it of remote) map.set(it.slug, it);
      for (const it of local) map.set(it.slug, it); // ローカル優先で union
      const merged = [...map.values()];
      persistSaved(merged); // UI 更新（イベント発火。ただし synced=false なので push はしない）
      if (merged.length) {
        await client
          .from("saved_programs")
          .upsert(
            merged.map((it) => toRow(user.id, it)),
            { onConflict: "user_id,program_slug" },
          );
      }
      syncedRef.current = true;
    },
    [],
  );

  // ローカルの現状をリモートへ反映（upsert＋ローカルに無い行を削除）。初回マージ後のみ実行。
  const reconcile = useCallback(
    async (client: SupabaseClient, user: User) => {
      const local = loadSaved();
      if (local.length) {
        await client
          .from("saved_programs")
          .upsert(
            local.map((it) => toRow(user.id, it)),
            { onConflict: "user_id,program_slug" },
          );
      }
      const slugs = local.map((i) => i.slug);
      let del = client.from("saved_programs").delete().eq("user_id", user.id);
      if (slugs.length) {
        del = del.not(
          "program_slug",
          "in",
          `(${slugs.map((s) => JSON.stringify(s)).join(",")})`,
        );
      }
      await del;
    },
    [],
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const user = data.session?.user ?? null;
      userRef.current = user;
      if (user) {
        setStatus("signedin");
        setEmail(user.email ?? null);
        void pullAndMerge(supabase, user);
      } else {
        setStatus("anon");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const user = session?.user ?? null;
      userRef.current = user;
      if (user) {
        setStatus("signedin");
        setEmail(user.email ?? null);
        void pullAndMerge(supabase, user);
      } else {
        setStatus("anon");
        setEmail(null);
        syncedRef.current = false;
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, pullAndMerge]);

  // ローカル変更（保存/削除）を、初回マージ後はリモートへ反映。
  useEffect(() => {
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onChange() {
      const user = userRef.current;
      if (!user || !syncedRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reconcile(supabase!, user), 400);
    }
    window.addEventListener(SAVED_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(SAVED_CHANGED_EVENT, onChange);
      if (timer) clearTimeout(timer);
    };
  }, [supabase, reconcile]);

  const signIn = useCallback(
    async (addr: string, password: string) => {
      if (!supabase) return { ok: false, error: "クラウド同期は未設定です" };
      const { error } = await supabase.auth.signInWithPassword({
        email: addr.trim(),
        password,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (addr: string, password: string) => {
      if (!supabase) return { ok: false, error: "クラウド同期は未設定です" };
      const { data, error } = await supabase.auth.signUp({
        email: addr.trim(),
        password,
      });
      if (error) return { ok: false, error: error.message };
      // メール確認オフなら session が返り即ログイン。確認オンなら session が無い。
      return { ok: true, needsConfirm: !data.session };
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { ok: false, error: "クラウド同期は未設定です" };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/saved` },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, [supabase]);

  return (
    <Ctx.Provider
      value={{
        status,
        email,
        enabled: Boolean(supabase),
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
