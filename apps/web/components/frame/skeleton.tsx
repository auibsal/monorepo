/**
 * Loading: the page's own shape in hairline grey, rows where the rows will
 * be, while the title is already there. The turning ring is only for
 * buttons.
 */
export const SkeletonRows = ({ rows = 3 }: { readonly rows?: number }) => (
  <div aria-hidden="true" className="grid gap-5 motion-safe:animate-pulse">
    {Array.from({ length: rows }, (_, index) => `row-${index}`).map((row) => (
      <div className="border-line grid gap-2 border-t pt-4" key={row}>
        <div className="bg-line h-4 w-2/3" />
        <div className="bg-line h-3 w-1/3" />
      </div>
    ))}
  </div>
);
