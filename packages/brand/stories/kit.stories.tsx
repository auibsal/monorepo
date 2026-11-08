import { ActionBar } from "@repo/brand/components/sal/action-bar";
import { ChoiceInput } from "@repo/brand/components/sal/choice-input";
import { type Column, DataTable } from "@repo/brand/components/sal/data-table";
import { Field } from "@repo/brand/components/sal/field";
import {
  EmptyLine,
  ErrorNotice,
  PageError,
} from "@repo/brand/components/sal/states";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * The pieces your account and the Diwan are built from. Each takes its
 * words as props, in the page's language; the app passes its messages.
 */
const meta = {
  title: "Components/Kit",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Row {
  readonly date: string;
  readonly id: string;
  readonly place: string;
  readonly title: string;
}

const rows: readonly Row[] = [
  {
    date: "Tuesday, November 10",
    id: "1",
    place: "Library, second floor",
    title: "A reading",
  },
  {
    date: "Thursday, November 19",
    id: "2",
    place: "Theater",
    title: "A rehearsal",
  },
];

const columns: readonly Column<Row>[] = [
  { cell: (row) => row.title, header: "Event", key: "title" },
  { cell: (row) => row.date, header: "Date", key: "date" },
  { cell: (row) => row.place, header: "Place", key: "place" },
];

/** A crimson hairline under the head, gray hairlines between rows; on a
 * phone each row stacks, the first column as its title. */
export const Table: Story = {
  render: () => (
    <DataTable
      caption="Events"
      columns={columns}
      empty="Nothing here yet."
      rowKey={(row) => row.id}
      rows={rows}
    />
  ),
};

export const EmptyTable: Story = {
  render: () => (
    <DataTable
      columns={columns}
      empty="Nothing here yet."
      rowKey={(row) => row.id}
      rows={[]}
    />
  ),
};

/** A label over its control; the render prop receives the control's id. */
export const LabeledField: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field hint="As it should appear on the card." label="Name">
        {(id) => <Input id={id} />}
      </Field>
    </div>
  ),
};

const labels = { choose: "Choose…", find: "Find", none: "No match" };

/** Choosing one of several is always a vertical list, never a pop-up. */
export const Choices: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field label="Section">
        {(id) => (
          <ChoiceInput defaultValue="news" id={id} labels={labels}>
            <option value="news">News</option>
            <option value="arts">Arts and Letters</option>
            <option value="opinion">Opinion</option>
          </ChoiceInput>
        )}
      </Field>
    </div>
  ),
};

/** From ten choices, a find line opens above the list. */
export const ManyChoices: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Field label="Month">
        {(id) => (
          <ChoiceInput id={id} labels={labels}>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </ChoiceInput>
        )}
      </Field>
    </div>
  ),
};

/** Every empty state offers one next action. */
export const Empty: Story = {
  render: () => (
    <EmptyLine
      action={
        <a className="link type-caption" href="#events">
          See what’s on
        </a>
      }
    >
      No bookings yet.
    </EmptyLine>
  ),
};

export const SectionError: Story = {
  render: () => (
    <ErrorNotice
      message="This didn’t load."
      onRetry={() => undefined}
      retryLabel="Try again"
    />
  ),
};

export const FailedPage: Story = {
  render: () => (
    <PageError
      description="An unexpected error occurred. Please try again."
      home={
        <a className="link self-center" href="#home">
          Go to the home page
        </a>
      }
      onRetry={() => undefined}
      retryLabel="Try again"
      title="Something went wrong."
    />
  ),
};

/** The page's one solid button; on a phone it stays at the bottom of the
 * screen once the page scrolls past it. */
export const MainAction: Story = {
  render: () => (
    <ActionBar>
      <Button type="button">Book a place</Button>
      <a className="link type-caption" href="#calendar">
        Add to your calendar
      </a>
    </ActionBar>
  ),
};
