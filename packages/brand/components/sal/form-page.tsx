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
    <label className="text-text text-sm font-medium" htmlFor={id}>
      {label}
    </label>
    {children}
    {hint ? <p className="text-text-secondary text-sm">{hint}</p> : null}
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
  /** Text to read before the fields (the form's own wording). */
  readonly notice?: ReactNode;
  readonly onSubmit?: FormEventHandler<HTMLFormElement>;
  /** Sending: the button waits. */
  readonly pending?: boolean;
  /** One sentence: what the form is for and who reads it. */
  readonly purpose: string;
  /**
   * The signature field: "Type your full name to sign", and its note. A
   * site may fill it (the name on the account) and follow it with
   * `value` and `onChange`, or leave it out (`omit`) where a form may be
   * sent without a name, such as an anonymous concern.
   */
  readonly signature: {
    readonly hint: string;
    readonly invalid?: boolean;
    readonly label: string;
    readonly omit?: boolean;
    readonly onChange?: (value: string) => void;
    /**
     * "Sign as …" (decisions.md, Documents and forms): the name the
     * register holds, shown in the signature's hand and not typed. Only
     * someone with no account (a parent by link) types a name.
     */
    readonly signAs?: string;
    readonly value?: string;
  };
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
  notice,
  onSubmit,
  pending = false,
  purpose,
  signature,
  submit,
  title,
}: FormPageProps) => (
  <form
    className={cn("gap-space-6 grid max-w-2xl print:max-w-none", className)}
    noValidate
    onSubmit={onSubmit}
  >
    <FormHeader code={code} title={title}>
      {purpose}
    </FormHeader>
    {notice ? (
      <div className="bg-surface-reading p-space-5 text-text">{notice}</div>
    ) : null}
    <div className="gap-space-5 grid">{children}</div>
    {signature.omit ? null : (
      <fieldset className="gap-space-3 border-line pt-space-5 grid border-t">
        <legend className="sr-only">{signature.label}</legend>
        {signature.signAs ? (
          <div className="gap-space-2 grid">
            <p className="type-label">{signature.label}</p>
            <p className="font-signature text-text border-text border-b pb-1 text-2xl">
              {signature.signAs}
            </p>
            <p className="text-text-secondary text-sm">{signature.hint}</p>
          </div>
        ) : (
          <FormField
            hint={signature.hint}
            id="form-signature"
            label={signature.label}
          >
            <input
              aria-invalid={signature.invalid}
              autoComplete="name"
              className="border-text font-signature text-text focus-visible:border-accent h-11 w-full border-b bg-transparent text-2xl outline-none"
              id="form-signature"
              maxLength={200}
              name="signature"
              onChange={
                signature.onChange
                  ? (event) => signature.onChange?.(event.target.value)
                  : undefined
              }
              required
              type="text"
              value={signature.value}
            />
          </FormField>
        )}
        <p className="text-text-secondary text-sm">
          {dateLabel} <span className="text-text">{date}</span>
        </p>
      </fieldset>
    )}
    <div className="gap-space-3 grid">
      <div className="gap-space-4 flex flex-wrap items-center print:hidden">
        <Button disabled={pending} type="submit">
          {submit}
        </Button>
      </div>
      <p className="text-text-secondary text-sm">{kept}</p>
    </div>
  </form>
);
