import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InviteRequestBody = {
  action: "invite" | "create";
  email: string;
  full_name: string;
  /**
   * Phase 5 (D-11): when present and `action === "invite"`, the function
   * looks up institutions.name, passes it as user_metadata for the Supabase
   * Auth template (`{{ .Data.institution_name }}`), and inserts an
   * institution_members row after invite success. Pre-flight email check
   * returns 409 with explicit pt-BR message when the email is already in
   * auth.users (D-06).
   */
  institution_id?: string;
};

type ResendInviteRequestBody = {
  action: "resend_invite";
  email: string;
  full_name?: string;
};

type DeleteRequestBody = {
  action: "delete";
  userId: string;
  soft?: boolean;
};

type RequestBody = InviteRequestBody | ResendInviteRequestBody | DeleteRequestBody;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(...keys: string[]) {
  for (const key of keys) {
    const value = Deno.env.get(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAlreadyRegisteredAuthError(message: string | undefined) {
  const normalizedMessage = (message ?? "").toLowerCase();
  return normalizedMessage.includes("already been registered") || normalizedMessage.includes("already registered");
}

function getInviteRedirectTo() {
  const appUrl = getOptionalEnv("APP_URL", "NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";

  try {
    return new URL("/auth/accept-invite", appUrl).toString();
  } catch (error) {
    console.error("Invalid APP_URL provided to Edge Function, using localhost fallback", {
      appUrl,
      error,
    });
    return "http://localhost:3000/auth/accept-invite";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        message: "Method not allowed.",
      },
      405,
    );
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return jsonResponse(
      {
        ok: false,
        message: "Missing bearer token.",
      },
      401,
    );
  }

  try {
    const supabaseUrl = getOptionalEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = getOptionalEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase URL or anon key in Edge Function environment");
      return jsonResponse(
        {
          ok: false,
          message: "Function is not configured correctly.",
        },
        500,
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      console.error("Admin auth validation failed on Criar-usuario", { authError });
      return jsonResponse(
        {
          ok: false,
          message: "Sessao invalida ou expirada.",
        },
        401,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to validate admin role on Criar-usuario", { profileError, userId: user.id });
      return jsonResponse(
        {
          ok: false,
          message: "Nao foi possivel validar permissao de administrador.",
        },
        500,
      );
    }

    if (profile?.role !== "admin") {
      return jsonResponse(
        {
          ok: false,
          message: "Apenas administradores podem executar esta operacao.",
        },
        403,
      );
    }

    let body: RequestBody;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          ok: false,
          message: "Body JSON invalido.",
        },
        400,
      );
    }

    if (body.action === "delete") {
      const userId = String(body.userId ?? "").trim();
      if (!userId) {
        return jsonResponse(
          {
            ok: false,
            message: "userId e obrigatorio para exclusao.",
          },
          400,
        );
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId, body.soft ?? false);

      if (deleteError) {
        console.error("Failed to delete user on Criar-usuario", {
          deleteError,
          adminId: user.id,
          targetUserId: userId,
        });
        return jsonResponse(
          {
            ok: false,
            message: deleteError.message || "Nao foi possivel excluir usuario.",
          },
          400,
        );
      }

      return jsonResponse({
        ok: true,
        deleted: true,
      });
    }

    if (body.action !== "invite" && body.action !== "create" && body.action !== "resend_invite") {
      return jsonResponse(
        {
          ok: false,
          message: "Action invalida. Use 'invite', 'create' ou 'resend_invite'.",
        },
        400,
      );
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return jsonResponse(
        {
          ok: false,
          message: "Email invalido.",
        },
        400,
      );
    }

    const redirectTo = getInviteRedirectTo();

    if (body.action === "resend_invite") {
      const fullName = String(body.full_name ?? "").trim();
      const inviteOptions: {
        data?: { full_name: string; name: string };
        redirectTo: string;
      } = {
        redirectTo,
      };

      if (fullName) {
        inviteOptions.data = {
          full_name: fullName,
          name: fullName,
        };
      }

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, inviteOptions);

      if (inviteError) {
        if (isAlreadyRegisteredAuthError(inviteError.message)) {
          const { error: recoveryError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
          if (!recoveryError) {
            return jsonResponse({
              ok: true,
              invited: false,
              resent: true,
              recovery_sent: true,
              user_id: null,
              redirectTo,
              message: "Usuario ja cadastrado. Email para definir ou recuperar senha enviado.",
            });
          }

          console.error("Failed to resend invite fallback recovery email on Criar-usuario", {
            inviteError,
            recoveryError,
            adminId: user.id,
            email,
            redirectTo,
          });
          return jsonResponse(
            {
              ok: false,
              message: recoveryError.message || inviteError.message || "Nao foi possivel reenviar convite.",
            },
            400,
          );
        }

        console.error("Failed to resend invite user on Criar-usuario", {
          inviteError,
          adminId: user.id,
          email,
          redirectTo,
        });
        return jsonResponse(
          {
            ok: false,
            message: inviteError.message || "Nao foi possivel reenviar convite.",
          },
          400,
        );
      }

      return jsonResponse({
        ok: true,
        invited: true,
        resent: true,
        user_id: inviteData.user?.id ?? null,
        redirectTo,
      });
    }

    const fullName = String(body.full_name ?? "").trim();
    if (!fullName) {
      return jsonResponse(
        {
          ok: false,
          message: "full_name e obrigatorio.",
        },
        400,
      );
    }

    // Phase 5 (D-11): institution_id branch — pre-flight email check and
    // institution lookup. When absent, the existing B2C-style invite behavior
    // is preserved verbatim (regression-safe for /admin/usuarios).
    let institutionName: string | null = null;
    let institutionIdNormalized: string | null = null;

    const rawInstitutionId = (body as InviteRequestBody).institution_id;
    const trimmedInstitutionId = typeof rawInstitutionId === "string" ? rawInstitutionId.trim() : "";

    if (trimmedInstitutionId) {
      institutionIdNormalized = trimmedInstitutionId;

      // D-06 + Open Question 4: pre-flight email check via auth.admin.listUsers.
      // Profiles table has no email column (verified RESEARCH line 1041); the
      // canonical source is auth.users.email accessed via the admin auth API.
      // Cap perPage at 1000 (Supabase default max). For MDHE single-tenant scale
      // this is sufficient; if user count grows beyond 1000, replace with a
      // paginated scan.
      // TODO: v2 — paginate listUsers calls if MDHE user count exceeds 1000
      // (current cap silently misses duplicates beyond index 1000; tracked
      // under EMAIL-03/INST-08; see Threat T-05-04-07).
      const listUsersRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listUsersRes.error) {
        console.error("Failed listUsers pre-flight on Criar-usuario", {
          error: listUsersRes.error.message,
          adminId: user.id,
          email,
        });
        return jsonResponse(
          {
            ok: false,
            message: "Não foi possível verificar email. Tente novamente.",
          },
          500,
        );
      }
      const normalizedEmail = email.trim().toLowerCase();
      const emailExists = (listUsersRes.data?.users ?? []).some(
        (u) => (u.email ?? "").toLowerCase() === normalizedEmail,
      );
      if (emailExists) {
        return jsonResponse(
          {
            ok: false,
            message: "Email já cadastrado. Use Adicionar aluno existente.",
          },
          409,
        );
      }

      // Lookup institution name for metadata (templates use this via
      // `{{ .Data.institution_name }}`).
      const { data: institution, error: instErr } = await supabaseAdmin
        .from("institutions")
        .select("id, name")
        .eq("id", institutionIdNormalized)
        .maybeSingle();
      if (instErr || !institution) {
        if (instErr) {
          console.error("Failed institution lookup on Criar-usuario", {
            error: instErr.message,
            adminId: user.id,
            institutionId: institutionIdNormalized,
          });
        }
        return jsonResponse(
          {
            ok: false,
            message: "Instituição não encontrada.",
          },
          404,
        );
      }
      institutionName = institution.name;
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        name: fullName,
        ...(institutionName ? { institution_name: institutionName } : {}),
      },
      redirectTo,
    });

    if (inviteError) {
      if (isAlreadyRegisteredAuthError(inviteError.message)) {
        const { error: recoveryError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
        if (!recoveryError) {
          return jsonResponse({
            ok: true,
            invited: false,
            resent: true,
            recovery_sent: true,
            user_id: null,
            redirectTo,
            message: "Usuario ja cadastrado. Email para definir ou recuperar senha enviado.",
          });
        }

        console.error("Failed invite fallback recovery email on Criar-usuario", {
          inviteError,
          recoveryError,
          adminId: user.id,
          email,
          redirectTo,
        });
        return jsonResponse(
          {
            ok: false,
            message: recoveryError.message || inviteError.message || "Nao foi possivel enviar convite.",
          },
          400,
        );
      }

      console.error("Failed to invite user on Criar-usuario", {
        inviteError,
        adminId: user.id,
        email,
        redirectTo,
      });
      return jsonResponse(
        {
          ok: false,
          message: inviteError.message || "Nao foi possivel enviar convite.",
        },
        400,
      );
    }

    // Phase 5 D-11: After invite success, link the new user to the institution.
    // Pitfall 6 (RESEARCH lines 687-707): the auth trigger that creates the
    // profiles row has timing variability. Defensively upsert the profiles row
    // so the institution_members FK insert below cannot fail with FK violation.
    //
    // Note: Deno cannot import src/lib/auth/profiles.ts:ensureProfileExists; we
    // reimplement the safe upsert inline here.
    if (institutionIdNormalized && inviteData?.user?.id) {
      const newUserId = inviteData.user.id;

      const profileUpsert = await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: newUserId, full_name: fullName, role: "student" },
          { onConflict: "id", ignoreDuplicates: true },
        );

      if (profileUpsert.error) {
        console.error("Convite enviado mas profile upsert falhou", {
          error: profileUpsert.error.message,
          newUserId,
          institutionId: institutionIdNormalized,
        });
        return jsonResponse(
          {
            ok: false,
            message: "Convite enviado, mas não foi possível preparar o perfil. Vincule manualmente.",
            warning: true,
            invited: true,
            user_id: newUserId,
          },
          207,
        );
      }

      const { error: memberErr } = await supabaseAdmin
        .from("institution_members")
        .insert({
          institution_id: institutionIdNormalized,
          profile_id: newUserId,
          role: "student",
        });

      if (memberErr) {
        console.error("Convite enviado mas vinculação falhou", {
          error: memberErr.message,
          newUserId,
          institutionId: institutionIdNormalized,
        });
        return jsonResponse(
          {
            ok: false,
            message: "Convite enviado, mas não foi possível vincular o aluno à instituição. Vincule manualmente.",
            warning: true,
            invited: true,
            user_id: newUserId,
          },
          207,
        );
      }

      return jsonResponse({
        ok: true,
        invited: true,
        user_id: newUserId,
        message: `Convite enviado para ${email} da instituição ${institutionName}.`,
        redirectTo,
      });
    }

    return jsonResponse({
      ok: true,
      invited: true,
      user_id: inviteData.user?.id ?? null,
      redirectTo,
    });
  } catch (error) {
    console.error("Unhandled error on Criar-usuario Edge Function", error);
    return jsonResponse(
      {
        ok: false,
        message: "Erro interno ao processar solicitacao.",
      },
      500,
    );
  }
});
