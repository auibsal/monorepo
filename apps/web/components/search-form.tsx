"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { useRouter } from "@repo/internationalization/navigation";
import { type FormEvent, useState } from "react";

/**
 * The search box: a search goes to its own address, /search/<words>. The
 * form still works without JavaScript (it sends ?q=).
 */
export const SearchForm = ({
  label,
  placeholder,
  query,
  submit,
}: {
  readonly label: string;
  readonly placeholder: string;
  readonly query: string;
  readonly submit: string;
}) => {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const go = (event: FormEvent<HTMLFormElement>) => {
    const words = value.trim();
    if (words.length >= 2) {
      event.preventDefault();
      router.push(`/search/${encodeURIComponent(words)}`);
    }
  };
  return (
    <form
      action="/search"
      className="flex max-w-xl gap-2"
      method="get"
      onSubmit={go}
    >
      <label className="sr-only" htmlFor="q">
        {label}
      </label>
      <Input
        id="q"
        maxLength={200}
        name="q"
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <Button type="submit">{submit}</Button>
    </form>
  );
};
