import { log } from "./log";

/** An error's message, logged once (the Vercel runtime log keeps it). */
export const parseError = (error: unknown): string => {
  let message: string;

  if (error instanceof Error) {
    ({ message } = error);
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    ({ message } = error as { message: string });
  } else {
    message = String(error);
  }

  log.error(`Parsing error: ${message}`);
  return message;
};
