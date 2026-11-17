import { notFound } from "next/navigation";
import {
  PRESET_KINDS,
  type PresetKind,
  PresetsAdmin,
} from "@/components/diwan/admin/presets";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.presets.title")
);

const isKind = (value: string): value is PresetKind =>
  (PRESET_KINDS as readonly string[]).includes(value);

/**
 * A kind's presets (decisions.md, The site: "Presets"):
 * /diwan/presets/<event|opening|call|announcement|letter>.
 */
const PresetsPage = async ({
  params,
}: {
  readonly params: Promise<{ kind: string }>;
}) => {
  const { kind } = await params;
  if (!isKind(kind)) {
    notFound();
  }
  return <PresetsAdmin kind={kind} />;
};

export default PresetsPage;
