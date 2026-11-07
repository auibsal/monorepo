"use client";

import { Input } from "@repo/brand/components/ui/input";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";

/**
 * A password field with a Show / Hide button (NIST SP 800-63B: let people
 * see what they type). The button is a text link beside the field, and
 * the field goes back to hidden once the form is sent.
 */
export const PasswordInput = ({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) => {
  const t = useTranslations("auth");
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-stretch gap-2" dir="ltr">
      <Input
        {...props}
        className={className ? `min-w-0 flex-1 ${className}` : "min-w-0 flex-1"}
        dir="ltr"
        spellCheck={false}
        type={shown ? "text" : "password"}
      />
      <button
        aria-controls={props.id}
        aria-pressed={shown}
        className="link shrink-0 px-1 text-sm"
        onClick={() => setShown((value) => !value)}
        type="button"
      >
        {shown ? t("hidePassword") : t("showPassword")}
      </button>
    </div>
  );
};
