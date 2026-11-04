import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test, vi } from "vitest";
import { deleteAccount } from "@/lib/api/deletion";

const USER_ID = "00000000-0000-0000-0000-00000000000a";

const fakeAdmin = (deleteError: Error | null = null) => {
  const deleteUser = vi.fn(() => Promise.resolve({ error: deleteError }));
  const getUserById = vi.fn(() =>
    Promise.resolve({ data: { user: { email: "gone@auib.edu.iq" } } })
  );
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  const profile = {
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: { locale: "ar" } }),
    }),
  };
  const schema = vi.fn(() => ({
    from: (table: string) =>
      table === "outbox" ? { insert } : { select: () => profile },
  }));
  const bucket = {
    list: vi.fn(() =>
      Promise.resolve({ data: [{ id: "1", name: "me.png" }], error: null })
    ),
    remove: vi.fn(() => Promise.resolve({ data: [], error: null })),
  };
  const admin = {
    auth: { admin: { deleteUser, getUserById } },
    schema,
    storage: { from: vi.fn(() => bucket) },
  } as unknown as SupabaseClient<Database>;
  return { admin, bucket, deleteUser, insert };
};

test("removes the avatar folder, then the user", async () => {
  const { admin, bucket, deleteUser } = fakeAdmin();
  await expect(deleteAccount(admin, USER_ID)).resolves.toEqual({
    removedFiles: 1,
    status: "deleted",
  });
  expect(admin.storage.from).toHaveBeenCalledWith("media");
  expect(bucket.list).toHaveBeenCalledWith(
    `avatars/${USER_ID}`,
    expect.anything()
  );
  expect(bucket.remove).toHaveBeenCalledWith([`avatars/${USER_ID}/me.png`]);
  expect(deleteUser).toHaveBeenCalledWith(USER_ID);
});

test("queues the last email to the address the account had", async () => {
  const { admin, insert } = fakeAdmin();
  await deleteAccount(admin, USER_ID);
  expect(insert).toHaveBeenCalledWith({
    kind: "account.deleted",
    payload: { email: "gone@auib.edu.iq", lang: "ar" },
  });
});

test("surfaces an Auth error, and sends nothing", async () => {
  const { admin, insert } = fakeAdmin(new Error("nope"));
  await expect(deleteAccount(admin, USER_ID)).rejects.toThrow("nope");
  expect(insert).not.toHaveBeenCalled();
});
