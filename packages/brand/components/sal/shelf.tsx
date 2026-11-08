"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";
import { Icon } from "./icon";

interface ShelfItem {
  readonly key: string;
  readonly node: ReactNode;
}

interface ShelfProps {
  readonly className?: string;
  /** Each item's width; by default about a book's, never wider than the screen. */
  readonly itemClassName?: string;
  readonly items: readonly ShelfItem[];
  /** Names the list for screen readers, e.g. "Editions". */
  readonly label: string;
  /**
   * The same content as a plain list at its own path (a localized link),
   * for anyone who would rather not browse a shelf.
   */
  readonly listLink?: ReactNode;
  readonly nextLabel: string;
  readonly previousLabel: string;
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isRtl = (element: HTMLElement) =>
  getComputedStyle(element).direction === "rtl";

/** The item whose start edge sits closest to the shelf's start edge. */
const nearestToStart = (list: HTMLElement) => {
  const box = list.getBoundingClientRect();
  const rtl = isRtl(list);
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  Array.from(list.children).forEach((child, index) => {
    const rect = child.getBoundingClientRect();
    const distance = rtl
      ? Math.abs(rect.right - box.right)
      : Math.abs(rect.left - box.left);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

/** Whether the shelf can scroll no further toward its end. */
const atEnd = (list: HTMLElement) =>
  Math.abs(list.scrollLeft) + list.clientWidth >= list.scrollWidth - 2;

/**
 * A shelf (decisions.md; design review A1): one row of items that
 * scrolls sideways and snaps to each, swiped on a phone and moved with the
 * arrow keys, Home and End. It is a plain list for screen readers. The item
 * at the start carries an ink hairline above it, the others the usual rule.
 * Arabic pages run right to left, so the shelf and its keys do too. The
 * previous and next controls are icons with labels; `listLink` offers the
 * same items as a plain list at its own path. Movement follows the brand's
 * Motion rules and stops when the system asks for reduced motion.
 */
export const Shelf = ({
  className,
  itemClassName,
  items,
  label,
  listLink,
  nextLabel,
  previousLabel,
}: ShelfProps) => {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [end, setEnd] = useState(false);

  const measure = useCallback(() => {
    const element = list.current;
    if (!element) {
      return;
    }
    setActive(nearestToStart(element));
    setEnd(atEnd(element));
  }, []);

  useEffect(() => {
    const element = list.current;
    if (!element) {
      return;
    }
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    element.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  const go = (index: number) => {
    const element = list.current;
    const target = element?.children[
      Math.max(0, Math.min(items.length - 1, index))
    ] as HTMLElement | undefined;
    if (!(element && target)) {
      return;
    }
    // Scroll the shelf alone, never the page around it.
    const box = element.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const delta = isRtl(element)
      ? rect.right - box.right
      : rect.left - box.left;
    element.scrollBy({
      behavior: reducedMotion() ? "auto" : "smooth",
      left: delta,
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const element = list.current;
    if (!element) {
      return;
    }
    const forward = isRtl(element) ? "ArrowLeft" : "ArrowRight";
    const back = isRtl(element) ? "ArrowRight" : "ArrowLeft";
    const moves: Record<string, number> = {
      [back]: active - 1,
      End: items.length - 1,
      [forward]: active + 1,
      Home: 0,
    };
    const next = moves[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    go(next);
  };

  return (
    <div className={cn("grid gap-space-3", className)}>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: the shelf's list moves with the arrow keys, like any scrolling region */}
      <ul
        aria-label={label}
        className="m-0 flex snap-x snap-mandatory list-none gap-space-4 overflow-x-auto p-0 pb-space-2 outline-offset-4 [scrollbar-width:thin]"
        onKeyDown={onKeyDown}
        ref={list}
        // The list takes the arrow keys, so it is in the tab order.
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must be reachable by keyboard
        tabIndex={0}
      >
        {items.map((item, index) => (
          <li
            className={cn(
              "w-[min(15rem,72vw)] shrink-0 snap-start border-t pt-space-3 transition-colors duration-base ease-standard",
              index === active ? "border-text" : "border-line",
              itemClassName
            )}
            key={item.key}
          >
            {item.node}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-space-4">
        <div className="type-caption">{listLink}</div>
        {items.length > 1 ? (
          <div className="flex items-center gap-space-2">
            <button
              aria-label={previousLabel}
              className="inline-flex size-11 items-center justify-center text-text transition-colors duration-quick ease-standard hover:text-accent disabled:text-text-secondary"
              disabled={active === 0}
              onClick={() => go(active - 1)}
              type="button"
            >
              <Icon className="rotate-180 rtl:rotate-0" name="arrow-right" />
            </button>
            <button
              aria-label={nextLabel}
              className="inline-flex size-11 items-center justify-center text-text transition-colors duration-quick ease-standard hover:text-accent disabled:text-text-secondary"
              disabled={end}
              onClick={() => go(active + 1)}
              type="button"
            >
              <Icon className="rtl:rotate-180" name="arrow-right" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
