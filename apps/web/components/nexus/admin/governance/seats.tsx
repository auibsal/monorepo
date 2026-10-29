"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { hasPermission } from "@repo/rbac";
import { governance, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { CouncilSeat } from "@/components/council-seats";
import { useGrants } from "@/lib/nexus/queries";
import { SectionSpinner } from "../../states";
import {
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";

const key = ["admin", "governance", "seats"];

const SeatRow = ({
  canEdit,
  seat,
  seats,
}: {
  readonly canEdit: boolean;
  readonly seat: CouncilSeat;
  readonly seats: readonly CouncilSeat[];
}) => {
  const t = useTranslations("nexus.admin.governance.seats");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [holder, setHolder] = useState({
    ar: seat.holder_ar ?? "",
    en: seat.holder_en ?? "",
  });
  const [cover, setCover] = useState(seat.covered_by ?? "");
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("council_seats")
          .update({
            covered_by: holder.en.trim() ? null : cover || null,
            holder_ar: holder.en.trim() ? holder.ar.trim() || null : null,
            holder_en: holder.en.trim() || null,
          })
          .eq("key", seat.key)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return (
    <li className="grid gap-4 border-line border-t py-space-4">
      <h4 className="type-subheading">{localized(seat, "title", locale)}</h4>
      {canEdit ? (
        <form
          className="grid max-w-3xl gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <BilingualField
            label={t("holder")}
            maxLength={120}
            onChange={setHolder}
            value={holder}
          />
          <Field hint={t("coverHint")} label={t("coveredBy")}>
            {(id) => (
              <SelectInput
                disabled={Boolean(holder.en.trim())}
                id={id}
                onChange={(e) => setCover(e.target.value)}
                value={cover}
              >
                <option value="">{t("noCover")}</option>
                {seats
                  .filter((s) => s.kind === "officer" && s.key !== seat.key)
                  .map((s) => (
                    <option key={s.key} value={s.key}>
                      {localized(s, "title", locale)}
                    </option>
                  ))}
              </SelectInput>
            )}
          </Field>
          <SaveButton pending={save.isPending} success={save.isSuccess} />
          <ErrorLine error={save.error} />
        </form>
      ) : (
        <p className="type-body">
          {localized(
            { holder_ar: seat.holder_ar, holder_en: seat.holder_en },
            "holder",
            locale
          ) || t("noCover")}
        </p>
      )}
    </li>
  );
};

/**
 * The Council page's seats (owner, Oct 30, 2026): each seat's holder, or
 * the officer who covers it. Kept by the General Secretary.
 */
export const Seats = () => {
  const t = useTranslations("nexus.admin.governance.seats");
  const { supabase } = useAuth();
  const grants = useGrants();
  const seats = useQuery({
    queryFn: () => governance.councilSeats(supabase),
    queryKey: key,
  });
  const canEdit = hasPermission(grants.data, "governance.manage");

  return (
    <section className="grid gap-3">
      <h3 className="type-subheading">{t("title")}</h3>
      <p className="type-caption">{t("hint")}</p>
      {seats.isPending ? <SectionSpinner /> : null}
      <ul className="grid">
        {seats.data?.map((seat) => (
          <SeatRow
            canEdit={canEdit}
            key={seat.key}
            seat={seat}
            seats={seats.data}
          />
        ))}
      </ul>
    </section>
  );
};
