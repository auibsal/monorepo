import type { ReactNode } from "react";
import { MediaTabs } from "@/components/diwan/admin/section-tabs";

const MediaLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <MediaTabs />
    {children}
  </div>
);

export default MediaLayout;
