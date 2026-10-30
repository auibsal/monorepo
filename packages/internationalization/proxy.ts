import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";

/**
 * Serves each page in the language its address names (no prefix: English;
 * /ar: Arabic) and keeps the locale prefix on every URL.
 */
export const internationalizationMiddleware = createMiddleware(routing);
