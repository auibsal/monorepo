import type { FormEventHandler, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { FormHeader } from "./form-header";

interface FormFieldProps {
  readonly children: ReactNode;
  /** A short note under the field, in text-secondary. */
  readonly hint?: string;
  /** The field's id, so the label points at it. */
  readonly id: string;
  /** A noun, in sentence case: "Date", "Proposed by". Never a question. */
  readonly label: string;
}

/** One field of a form page: the label above, the input, an optional hint. */
export const FormField = ({ children, hint, id, label }: FormFieldProps) => (
  <div className="grid gap-2">
    <label className="font-medium text-sm text-text" htmlFor={id}>
      {label}
    </label>
    {children}
    {hint ? <p className="text-sm text-text-secondary">{hint}</p> : null}
  </div>
);

interface FormPageProps {
  /** The fields, in one column (`FormField`); choices as a vertical list. */
  readonly children: ReactNode;
  readonly className?: string;
  /** The form's code in the register, "SAL-EXB-01 · F-15". */
  readonly code: string;
  /** Today's date, already formatted ("Saturday, November 7"). */
  readonly date: string;
  /** The word before the date: "Date". */
  readonly dateLabel: string;
  /** What happens after sending and where the signed copy is kept. */
  readonly kept: string;
  readonly onSubmit?: FormEventHandler<HTMLFormElement>;
  /** One sentence: what the form is for and who reads it. */
  readonly purpose: string;
  /** The signature field: "Type your full name to sign", and its note. */
  readonly signature: { readonly hint: string; readonly label: string };
  /** The button: "Sign and send". */
  readonly submit: string;
  readonly title: string;
}

/**
 * The standard form page (SAL-MED-02, Documents and forms; decided Nov 7):
 * every Society form people outside the staff fill lives on one page at
 * auibsal.org/forms/<number>. The code and a Light title, one sentence on
 * what it is for, the fields in one column, a signature by typed name with
 * the date, and one solid button. The site keeps the signed copy. The
 * printed backup is this same page printed from the browser (the button
 * drops out).
 */
export const FormPage = ({
  children,
  className,
  code,
  date,
  dateLabel,
  kept,
  onSubmit,
  purpose,
  signature,
  submit,
  title,
}: FormPageProps) => (
  <form
    className={cn("grid max-w-2xl gap-space-6 print:max-w-none", className)}
    onSubmit={onSubmit}
  >
    <FormHeader code={code} title={title}>
      {purpose}
    </FormHeader>
    <div className="grid gap-space-5">{children}</div>
    <fieldset className="grid gap-space-3 border-line border-t pt-space-5">
      <legend className="sr-only">{signature.label}</legend>
      <FormField
        hint={signature.hint}
        id="form-signature"
        label={signature.label}
      >
        <input
          autoComplete="name"
          className="h-11 w-full border-text border-b bg-transparent font-light text-2xl text-text outline-none focus-visible:border-accent"
          id="form-signature"
          name="signature"
          required
          type="text"
        />
      </FormField>
      <p className="text-sm text-text-secondary">
        {dateLabel} <span className="text-text">{date}</span>
      </p>
    </fieldset>
    <div className="grid gap-space-3">
      <div className="flex flex-wrap items-center gap-space-4 print:hidden">
        <Button type="submit">{submit}</Button>
      </div>
      <p className="text-sm text-text-secondary">{kept}</p>
    </div>
  </form>
);
