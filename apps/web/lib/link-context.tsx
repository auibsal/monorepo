"use client";

import { Link as SiteLink } from "@repo/internationalization/navigation";
import { type ComponentProps, createContext, useContext } from "react";

type LinkComponent = (
  props: ComponentProps<typeof SiteLink>
) => React.ReactNode;

const LinkContext = createContext<LinkComponent>(SiteLink);

/**
 * The link that shared pieces (empty states) use for in-app paths: the
 * site's on the members' pages, the Diwan's (which adds /diwan) inside it.
 */
export const LinkProvider = LinkContext.Provider;

export const useAppLink = () => useContext(LinkContext);
