import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

/** Constant-time check of `Authorization: Bearer <secret>`. Fails closed. */
export const hasBearer = (
  header: string | string[] | undefined,
  secret: string | undefined
) => {
  if (!secret || typeof header !== "string") {
    return false;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

export const sendJson = (
  res: ServerResponse,
  status: number,
  body: unknown
) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;
