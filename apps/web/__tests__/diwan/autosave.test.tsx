import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { DraftOffer, useAutosave } from "@/lib/diwan/autosave";
import { fakeSupabase, renderWithApp } from "./render";

const RESTORE = /Restore your changes from/u;

/** api.drafts in memory, by record. */
const draftsStore = () => {
  const rows = new Map<string, { data: unknown; updated_at: string }>();
  const from = () => ({
    delete: () => ({
      eq: (_: string, key: string) => {
        rows.delete(key);
        return Promise.resolve({ error: null });
      },
    }),
    select: () => ({
      eq: (_: string, key: string) => ({
        maybeSingle: () => Promise.resolve({ data: rows.get(key) ?? null }),
      }),
    }),
    upsert: (row: { data: unknown; record_key: string }) => {
      rows.set(row.record_key, {
        data: row.data,
        updated_at: "2026-11-17T11:14:00Z",
      });
      return Promise.resolve({ error: null });
    },
  });
  return { from, rows };
};

const Form = () => {
  const [text, setText] = useState("");
  const autosave = useAutosave({
    initial: "",
    recordKey: "announcement:new",
    value: text,
  });
  return (
    <form>
      <DraftOffer autosave={autosave} onRestore={setText} />
      <label>
        Title
        <input onChange={(e) => setText(e.target.value)} value={text} />
      </label>
      <button onClick={() => autosave.clear()} type="button">
        Save
      </button>
    </form>
  );
};

describe("autosave", () => {
  test("closed mid-edit, reopened and restored; Save leaves no draft", async () => {
    const store = draftsStore();
    const supabase = fakeSupabase({ schema: () => ({ from: store.from }) });
    Object.assign(supabase.auth, {
      onAuthStateChange: (
        listen: (event: string, session: { user: { id: string } }) => void
      ) => {
        listen("SIGNED_IN", { user: { id: "me" } });
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    });

    const first = renderWithApp(<Form />, { locale: "en", supabase });
    const input = await screen.findByLabelText("Title");
    await new Promise((r) => setTimeout(r, 50));
    fireEvent.change(input, { target: { value: "Half a title" } });
    await waitFor(() => expect(store.rows.size).toBe(1), { timeout: 3000 });
    first.unmount();

    renderWithApp(<Form />, { locale: "en", supabase });
    const restore = await screen.findByRole("button", {
      name: RESTORE,
    });
    fireEvent.click(restore);
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "Half a title"
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(store.rows.size).toBe(0));
  });
});
