"use client";

import { useEffect, useState } from "react";

import type { ProfileRow } from "@/lib/auth/profiles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UseUserProfileState = {
  profile: ProfileRow | null;
  loading: boolean;
  error: string | null;
};

export function useUserProfile() {
  const [state, setState] = useState<UseUserProfileState>({
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message);
        }

        if (!user) {
          if (!cancelled) {
            setState({ profile: null, loading: false, error: null });
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!cancelled) {
          setState({ profile: (data as ProfileRow | null) ?? null, loading: false, error: null });
        }
      } catch (exception) {
        const message = exception instanceof Error ? exception.message : "Falha ao carregar perfil";
        if (!cancelled) {
          setState({ profile: null, loading: false, error: message });
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
