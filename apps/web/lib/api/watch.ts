import "server-only";

import { connect } from "node:tls";
import { createAdminClient } from "@repo/database/admin";
import { diwanUrl } from "@repo/internationalization";
import { baghdadDate, baghdadHour } from "./bot/feeds";
import { staffAlert } from "./bot/upkeep";

const DOMAIN = "auibsal.org";
const DAY_MS = 864e5;
/** Alert this many days before the domain or certificate runs out. */
const WARN_DAYS = 30;
const URGENT_DAYS = 7;

const daysLeft = (until: Date, now: Date) =>
  Math.floor((until.getTime() - now.getTime()) / DAY_MS);

/** The domain's expiry from the registry's public RDAP record. */
const domainExpiry = async () => {
  const response = await fetch(`https://rdap.org/domain/${DOMAIN}`, {
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const record = (await response.json()) as {
    events?: { eventAction: string; eventDate: string }[];
  };
  const date = record.events?.find(
    (e) => e.eventAction === "expiration"
  )?.eventDate;
  return date ? new Date(date) : null;
};

/** When the site's certificate runs out. */
const certificateExpiry = () =>
  new Promise<Date | null>((resolve) => {
    const socket = connect(
      { host: DOMAIN, port: 443, servername: DOMAIN, timeout: 8000 },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        resolve(cert?.valid_to ? new Date(cert.valid_to) : null);
      }
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });

const expiryAlert = async (
  what: "domain" | "certificate",
  until: Date | null,
  now: Date
) => {
  if (!until) {
    return;
  }
  const left = daysLeft(until, now);
  if (left > WARN_DAYS) {
    return;
  }
  const n = String(left);
  await staffAlert({
    key: `${what}:${baghdadDate(now)}`,
    team: "council",
    text_ar:
      what === "domain"
        ? `ينتهي تسجيل النطاق ${DOMAIN} بعد ${n} يومًا. تأكد من التجديد التلقائي عند المسجّل.`
        : `تنتهي شهادة الموقع بعد ${n} يومًا. تُجدَّد على Vercel تلقائيًا؛ إن لم تتجدد فراجع النطاق هناك.`,
    text_en:
      what === "domain"
        ? `The domain ${DOMAIN} expires in ${n} days. Check that auto-renew is on at the registrar.`
        : `The site's certificate expires in ${n} days. Vercel renews it on its own; if it hasn't, check the domain there.`,
    urgent: left <= URGENT_DAYS,
  });
};

/** The database advisors (the Desk's findings), as one alert a day. */
const advisorAlert = async (now: Date) => {
  const { data } = await createAdminClient()
    .schema("core")
    .rpc("advisor_findings");
  const count = (data ?? []).length;
  if (!count) {
    return;
  }
  const n = String(count);
  await staffAlert({
    key: `advisors:${baghdadDate(now)}`,
    link: diwanUrl("en", "/"),
    team: "council",
    text_ar: `للمستشار الأمني لقاعدة البيانات ${n} ملاحظات. هي في «المكتب»، تحت «المتصل».`,
    text_en: `The database advisors have ${n} findings. They are on the Desk, under Connected.`,
  });
};

/**
 * Once a day (at 7:00 a.m. Baghdad time, before the 8:00 digest): the
 * domain, the certificate and the database advisors, each written as a
 * staff alert for the Council's topic when something needs a look.
 */
export const runWatch = async (now = new Date()) => {
  if (baghdadHour(now) !== 7) {
    return;
  }
  const [domain, certificate] = await Promise.all([
    domainExpiry(),
    certificateExpiry(),
  ]);
  await Promise.all([
    expiryAlert("domain", domain, now),
    expiryAlert("certificate", certificate, now),
    advisorAlert(now),
  ]);
};
