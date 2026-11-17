"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Whether the page shown is a deep one (decisions.md, The site: one
 * navigation standard): a record's own page. Deep pages hide the side
 * menu and show a breadcrumb and a back link; the record page says so as
 * it renders, so no list of addresses has to keep up.
 */
const DeepPage = createContext<{
  readonly deep: boolean;
  readonly setDeep: (deep: boolean) => void;
}>({ deep: false, setDeep: () => undefined });

export const DeepPageProvider = ({ children }: { children: ReactNode }) => {
  const [deep, setDeep] = useState(false);
  const value = useMemo(() => ({ deep, setDeep }), [deep]);
  return <DeepPage.Provider value={value}>{children}</DeepPage.Provider>;
};

export const useIsDeepPage = () => useContext(DeepPage).deep;

/** Marks the page shown as deep while it is shown. */
export const useMarkDeepPage = () => {
  const { setDeep } = useContext(DeepPage);
  useEffect(() => {
    setDeep(true);
    return () => setDeep(false);
  }, [setDeep]);
};
