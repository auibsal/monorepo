import { buttonVariants } from "@repo/brand/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";

/**
 * A section's door (decisions.md, Qirtas: "Each section's own door"): the
 * first an outline button (Qirtas's one solid button is "Send your work" in
 * its nameplate), the rest text links. Forms are not fetched ahead: they run
 * on your account's code, which would weigh on every page of the paper.
 */
export const DoorLink = ({
  door,
  main,
}: {
  readonly door: { readonly href: string; readonly key: string };
  readonly main: boolean;
}) => {
  const t = useTranslations("web.journal.doors");
  const className = main
    ? buttonVariants({ variant: "outline" })
    : "link text-sm font-medium";
  const label = t(door.key as "send");
  return door.href.startsWith("mailto:") ? (
    <a className={className} href={door.href}>
      {label}
    </a>
  ) : (
    <Link className={className} href={door.href} prefetch={false}>
      {label}
    </Link>
  );
};
