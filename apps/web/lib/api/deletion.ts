import type { Database } from "@repo/database";
import { buckets, removeFolder } from "@repo/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

export interface AccountDeletion {
  removedFiles: number;
  status: "deleted";
}

/**
 * Deletes the caller's account. The avatar folder goes first (files have no
 * foreign key to users); deleting the auth user then cascades to the
 * profile, membership, pledges, RSVPs and role assignments. Ledger entries
 * and ballots are kept (append-only), with no link back to the person.
 */
export const deleteAccount = async (
  admin: Client,
  userId: string
): Promise<AccountDeletion> => {
  const removedFiles = await removeFolder(
    admin,
    buckets.media.id,
    `avatars/${userId}`
  );

  // The last email goes to the address the account had, once it is gone
  // (the outbox holds the address, not the account).
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .schema("core")
      .from("profiles")
      .select("locale")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
  const email = user?.user?.email;
  if (email) {
    await admin
      .schema("core")
      .from("outbox")
      .insert({
        kind: "account.deleted",
        payload: { email, lang: profile?.locale === "ar" ? "ar" : "en" },
      });
  }

  return { removedFiles, status: "deleted" };
};
