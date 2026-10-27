import { apiPath } from "@repo/internationalization";

/** The Pass routes take no session: they are how one starts. */
export async function postPass<T>(path: string, body: object): Promise<T> {
  const response = await fetch(apiPath(path), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "sign_in_failed");
  }
  return data;
}
