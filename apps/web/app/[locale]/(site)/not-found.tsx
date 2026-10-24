import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";

/** A missing page, told as one: the unwritten chapter. */
const NotFound = () => {
  const t = useTranslations("web.notFound");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-4 py-20">
      <h1 className="type-display">{t("title")}</h1>
      <p className="type-lede max-w-xl">{t("description")}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">{t("search")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
