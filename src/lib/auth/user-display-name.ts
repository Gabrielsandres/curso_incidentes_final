import type { User } from "@supabase/supabase-js";

export function getUserDisplayName(user: Pick<User, "email" | "user_metadata">, profileFullName?: string | null) {
  const fromProfile = typeof profileFullName === "string" ? profileFullName.trim() : "";
  if (fromProfile.length > 0) {
    return fromProfile;
  }

  const fromMetadata =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
    null;

  if (fromMetadata) {
    return fromMetadata;
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0];
  }

  return "Aluno";
}
