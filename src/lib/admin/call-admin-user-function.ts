import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CreateAdminUserPayload = {
  action: "create";
  email: string;
  password: string;
  full_name: string;
};

type DeleteAdminUserPayload = {
  action: "delete";
  userId: string;
  soft?: boolean;
};

export type AdminUserFunctionPayload = CreateAdminUserPayload | DeleteAdminUserPayload;

type AdminUserFunctionSuccess = {
  ok: true;
  data: unknown;
};

type AdminUserFunctionFailure = {
  ok: false;
  status?: number;
  message: string;
  details?: unknown;
};

export type AdminUserFunctionResult = AdminUserFunctionSuccess | AdminUserFunctionFailure;

function getFunctionEndpoint() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao configurada.");
  }

  return `${supabaseUrl}/functions/v1/Criar-usuario`;
}

function getPublishableKey() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) nao configurada.");
  }

  return publishableKey;
}

function getErrorMessageFromResponse(status: number, responseBody: unknown) {
  if (status === 403) {
    return "Voce nao tem permissao para cadastrar usuarios.";
  }

  if (status === 401) {
    return "Sessao expirada. Faca login novamente.";
  }

  if (typeof responseBody === "object" && responseBody !== null) {
    const body = responseBody as Record<string, unknown>;
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      (typeof body.msg === "string" && body.msg);

    if (message) {
      return message;
    }
  }

  if (typeof responseBody === "string" && responseBody.trim()) {
    return responseBody;
  }

  return "Nao foi possivel concluir a operacao. Tente novamente.";
}

export async function callAdminUserFunction(payload: AdminUserFunctionPayload): Promise<AdminUserFunctionResult> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return {
        ok: false,
        message: "Nao foi possivel validar a sessao atual.",
        details: error,
      };
    }

    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return {
        ok: false,
        status: 401,
        message: "Sessao expirada. Faca login novamente.",
      };
    }

    const response = await fetch(getFunctionEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: getPublishableKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    let parsedBody: unknown = null;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: getErrorMessageFromResponse(response.status, parsedBody),
        details: parsedBody,
      };
    }

    return {
      ok: true,
      data: parsedBody,
    };
  } catch (error) {
    return {
      ok: false,
      message: "Falha de rede ao chamar a Edge Function. Tente novamente.",
      details: error,
    };
  }
}
