import { SupabaseClient } from "@supabase/supabase-js";

export async function resolveSharedEmails<T extends { user_id: string; shared_with_id?: string | null }>(
  items: T[],
  userId: string,
  supabase: SupabaseClient,
  emailCacheRef: React.MutableRefObject<Record<string, string>>
): Promise<(T & { display_share_info: string | null })[]> {
  const neededIds = Array.from(
    new Set(
      items
        .map((item) => (item.user_id === userId ? item.shared_with_id : item.user_id))
        .filter((id): id is string => typeof id === "string" && id !== userId && !emailCacheRef.current[id])
    )
  );

  if (neededIds.length > 0) {
    const { data: emailData } = await supabase.rpc("get_emails_by_ids", { user_ids: neededIds });
    if (emailData) {
      const newEmails = (emailData as { id: string; email: string }[]).reduce<Record<string, string>>(
        (acc, curr) => { acc[curr.id] = curr.email; return acc; }, {}
      );
      emailCacheRef.current = { ...emailCacheRef.current, ...newEmails };
    }
  }

  const currentEmails = emailCacheRef.current;

  return items.map((item) => {
    const isOwner = item.user_id === userId;
    const isPrivate = item.user_id === item.shared_with_id;
    if (isPrivate) {
      return { ...item, display_share_info: null };
    }

    const targetId = isOwner ? item.shared_with_id : item.user_id;
    const email = targetId ? (currentEmails[targetId] ?? "...") : "";
    const displayShareInfo = isOwner 
      ? `Udostępniono: ${email}` 
      : `Od: ${email}`;

    return {
      ...item,
      display_share_info: displayShareInfo,
    };
  });
}

export async function getUserIdByEmail(email: string | null | undefined, supabase: SupabaseClient): Promise<string | null> {
  if (!email?.includes("@")) return null;
  const { data } = await supabase.rpc("get_user_id_by_email", {
    email_address: email.trim().toLowerCase(),
  });
  return data || null;
}