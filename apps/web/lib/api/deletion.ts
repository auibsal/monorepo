import type { Database } from "@repo/database";
import { buckets, removeFolder } from "@repo/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

export interface AccountDeletion {
  removedFiles: number;
  status: "deleted";
}

/**
 * Every stored file that is the person's own (decisions §11): the avatar
 * folder, the files of their Qirtas submissions with their blind copies
 * and the photographs of their Tour pages. Files have no foreign key to users, so they go first, by path.
 * What the Society published stays (a piece's own media), as the piece
 * does.
 */
const ownFiles = async (admin: Client, userId: string) => {
  const { data: submissions } = await admin
    .schema("journal")
    .from("submissions")
    .select("id")
    .eq("author_id", userId);
  const ids = (submissions ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return [];
  }
  const { data: files } = await admin
    .schema("journal")
    .from("submission_files")
    .select("storage_path, blind_path")
    .in("submission_id", ids);
  return (files ?? []).flatMap((file) =>
    [file.storage_path, file.blind_path].filter(
      (path): path is string => typeof path === "string" && path !== ""
    )
  );
};

/**
 * Deletes the caller's account. Their own files go first (`ownFiles`);
 * deleting the auth user then cascades to the profile, membership, pledges,
 * RSVPs, submissions and role assignments, and the Wallet pass is retired.
 * Ballots are kept (append-only), with no link back to the person.
 */
export const deleteAccount = async (
  admin: Client,
  userId: string
): Promise<AccountDeletion> => {
  const avatars = await removeFolder(
    admin,
    buckets.media.id,
    `avatars/${userId}`
  );
  const submitted = await ownFiles(admin, userId);
  if (submitted.length > 0) {
    const { error: removeError } = await admin.storage
      .from(buckets.submissions.id)
      .remove(submitted);
    if (removeError) {
      throw removeError;
    }
  }
  // The Tour pages the station photographed for them (decisions §12).
  const { data: pages } = await admin
    .schema("programmes")
    .from("six_words")
    .select("photo_path")
    .eq("user_id", userId)
    .not("photo_path", "is", null);
  const photos = (pages ?? []).flatMap((page) =>
    page.photo_path ? [page.photo_path] : []
  );
  if (photos.length > 0) {
    const { error: photoError } = await admin.storage
      .from(buckets.tourPages.id)
      .remove(photos);
    if (photoError) {
      throw photoError;
    }
  }
  const removedFiles = avatars + submitted.length + photos.length;

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
  // The activity log keeps no lines by or about someone who has gone
  // (audit E1).
  await Promise.all([
    admin.schema("core").from("activity_log").delete().eq("actor_id", userId),
    admin
      .schema("core")
      .from("activity_log")
      .delete()
      .or(`new_row->>user_id.eq.${userId},old_row->>user_id.eq.${userId}`),
  ]);
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
