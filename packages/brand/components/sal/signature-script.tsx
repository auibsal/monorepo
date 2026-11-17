import { cn } from "../../lib/utils";

const ARABIC = /[؀-ۿ]/u;

/**
 * The signer's name in the signature face (decisions.md, Documents and
 * forms: "The signature block shows the whole name"): it scales down with
 * its box to a minimum size, then wraps to a second line, never cut or
 * hidden; the line height and padding leave room for the script's tall and
 * low strokes in both languages.
 */
export const SignatureScript = ({
  className,
  name,
}: {
  readonly className?: string;
  readonly name: string;
}) => {
  const arabic = ARABIC.test(name);
  return (
    <span className={cn("@container block min-w-0", className)}>
      <span
        className={cn(
          "font-signature text-text block py-[0.2em] leading-[1.45] [text-wrap:balance] [overflow-wrap:anywhere]",
          // As large as the box allows, down to the minimum, then a
          // second line.
          arabic
            ? "text-[clamp(1.5rem,9cqi,1.875rem)]"
            : "text-[clamp(1.5rem,10cqi,2.25rem)]"
        )}
        data-signature-script
        dir={arabic ? "rtl" : "ltr"}
        lang={arabic ? "ar" : "en"}
      >
        {name}
      </span>
    </span>
  );
};
