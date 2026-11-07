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
  const submissions = {
    eq: () => Promise.resolve({ data: [{ id: "s1" }] }),
  };
  const files = {
    in: () =>
      Promise.resolve({
        data: [{ blind_path: "blind/s1/x.pdf", storage_path: "s1/x.pdf" }],
      }),
  };
  const pages = {
    eq: () => ({
      not: () =>
        Promise.resolve({
          data: [
            { photo_path: "station/00000000-0000-0000-0000-000000000001.jpg" },
          ],
        }),
    }),
  };
  const tables: Record<string, unknown> = {
    outbox: { insert },
    profiles: { select: () => profile },
    six_words: { select: () => pages },
    submission_files: { select: () => files },
    submissions: { select: () => submissions },
  };
  const schema = vi.fn(() => ({ from: (table: string) => tables[table] }));
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

test("removes the person's own files, then the user", async () => {
  const { admin, bucket, deleteUser } = fakeAdmin();
  await expect(deleteAccount(admin, USER_ID)).resolves.toEqual({
    removedFiles: 4,
    status: "deleted",
  });
  expect(admin.storage.from).toHaveBeenCalledWith("media");
  expect(bucket.list).toHaveBeenCalledWith(
    `avatars/${USER_ID}`,
    expect.anything()
  );
  expect(bucket.remove).toHaveBeenCalledWith([`avatars/${USER_ID}/me.png`]);
  // Their Qirtas submissions' files and blind copies (decisions §11).
  expect(admin.storage.from).toHaveBeenCalledWith("submissions");
  expect(bucket.remove).toHaveBeenCalledWith(["s1/x.pdf", "blind/s1/x.pdf"]);
  // The photographs of their Tour pages (decisions §12).
  expect(admin.storage.from).toHaveBeenCalledWith("tour-pages");
  expect(bucket.remove).toHaveBeenCalledWith([
    "station/00000000-0000-0000-0000-000000000001.jpg",
  ]);
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
