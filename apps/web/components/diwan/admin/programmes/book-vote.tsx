"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { localized, programmes, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  AddInPlace,
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  SaveButton,
} from "../kit";

const BOOKS = 3;
const key = (programmeId: string) => ["admin", "book-ballots", programmeId];
type Ballot = Awaited<ReturnType<typeof programmes.bookBallots>>[number];

const NewBallot = ({
  onDone,
  programmeId,
}: {
  readonly onDone: () => void;
  readonly programmeId: string;
}) => {
  const t = useTranslations("diwan.admin.programmes.vote");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState({ ar: "", en: "" });
  const [closes, setCloses] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("book_ballots")
          .insert({
            closes_at: new Date(closes ?? "").toISOString(),
            programme_id: programmeId,
            title_ar: title.ar.trim(),
            title_en: title.en.trim(),
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key(programmeId) });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <BilingualField
        label={t("ballotTitle")}
        maxLength={120}
        onChange={setTitle}
        value={title}
      />
      <DateTimeField
        label={t("closes")}
        onChange={setCloses}
        required
        value={closes}
      />
      <SaveButton
        disabled={!(closes && (title.en.trim() || title.ar.trim()))}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

const NewBook = ({
  ballotId,
  onDone,
  programmeId,
}: {
  readonly ballotId: string;
  readonly onDone: () => void;
  readonly programmeId: string;
}) => {
  const t = useTranslations("diwan.admin.programmes.vote");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState({ ar: "", en: "" });
  const [author, setAuthor] = useState({ ar: "", en: "" });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("programmes").from("book_choices").insert({
          author_ar: author.ar.trim(),
          author_en: author.en.trim(),
          ballot_id: ballotId,
          title_ar: title.ar.trim(),
          title_en: title.en.trim(),
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key(programmeId) });
      onDone();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };
  return (
    <form className="grid gap-4" onSubmit={submit}>
      <BilingualField
        label={t("bookTitle")}
        maxLength={200}
        onChange={setTitle}
        value={title}
      />
      <BilingualField
        label={t("author")}
        maxLength={200}
        onChange={setAuthor}
        value={author}
      />
      <SaveButton
        disabled={!(title.en.trim() || title.ar.trim())}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

/** One ballot: its books with their votes so far, and its closing time. */
const BallotSection = ({
  ballot,
  programmeId,
}: {
  readonly ballot: Ballot;
  readonly programmeId: string;
}) => {
  const t = useTranslations("diwan.admin.programmes.vote");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const counts = useQuery({
    queryFn: () => programmes.ballotCounts(supabase, ballot.id),
    queryKey: ["admin", "ballot-counts", ballot.id],
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key(programmeId) });
  const removeBook = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("book_choices")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  const removeBallot = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("book_ballots")
          .delete()
          .eq("id", ballot.id)
      ),
    onSuccess: refresh,
  });
  const open = Date.parse(ballot.closes_at) > Date.now();
  const total = (counts.data ?? []).reduce((sum, c) => sum + c.votes, 0);
  return (
    <DiwanSection
      action={
        <ConfirmAction
          confirmLabel={t("removeBallot")}
          description={t("removeBallotConfirm")}
          disabled={removeBallot.isPending}
          onConfirm={() => removeBallot.mutate()}
          variant="ghost"
        >
          {t("removeBallot")}
        </ConfirmAction>
      }
      description={t(open ? "closesOn" : "closedOn", {
        count: total,
        date: formatDateTime(ballot.closes_at, locale),
        votes: String(total),
      })}
      id={`ballot-${ballot.id}`}
      title={
        localized(ballot, "title", locale) || ballot.title_en || ballot.title_ar
      }
    >
      {ballot.books.length === 0 ? (
        <EmptyLine>{t("noBooks")}</EmptyLine>
      ) : (
        <RowList>
          {ballot.books.map((book) => {
            const votes =
              counts.data?.find((c) => c.choice_id === book.id)?.votes ?? 0;
            return (
              <li
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                key={book.id}
              >
                <span className="grid gap-0.5">
                  <span className="type-body">
                    {localized(book, "title", locale) ||
                      book.title_en ||
                      book.title_ar}
                  </span>
                  <span className="type-caption text-text-secondary">
                    {[
                      localized(book, "author", locale),
                      t("votes", { count: votes, votes: String(votes) }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {total === 0 ? (
                  <ConfirmAction
                    confirmLabel={t("removeBook")}
                    description={t("removeBookConfirm")}
                    disabled={removeBook.isPending}
                    onConfirm={() => removeBook.mutate(book.id)}
                    variant="ghost"
                  >
                    {t("removeBook")}
                  </ConfirmAction>
                ) : null}
              </li>
            );
          })}
        </RowList>
      )}
      {ballot.books.length < BOOKS && total === 0 ? (
        <AddInPlace label={t("addBook")}>
          {(close) => (
            <NewBook
              ballotId={ballot.id}
              onDone={close}
              programmeId={programmeId}
            />
          )}
        </AddInPlace>
      ) : null}
      <ErrorLine error={removeBook.error ?? removeBallot.error} />
    </DiwanSection>
  );
};

/**
 * Book Circle's vote (the design review A33, decision D12, Nov 4, 2026):
 * the host opens a ballot with up to three books and a closing time;
 * members vote on the program's page; the host sees the counts as they
 * come, everyone else once it closes.
 */
export const BookVote = ({ programmeId }: { readonly programmeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.vote");
  const { supabase } = useAuth();
  const ballots = useQuery({
    queryFn: () => programmes.bookBallots(supabase, programmeId),
    queryKey: key(programmeId),
  });
  return (
    <div className="grid max-w-3xl gap-10">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <AddInPlace label={t("newBallot")}>
        {(close) => <NewBallot onDone={close} programmeId={programmeId} />}
      </AddInPlace>
      {ballots.isPending ? <SectionSpinner /> : null}
      {ballots.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
      {ballots.data?.map((ballot) => (
        <BallotSection
          ballot={ballot}
          key={ballot.id}
          programmeId={programmeId}
        />
      ))}
    </div>
  );
};
