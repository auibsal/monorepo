import { Icon, type IconName } from "@repo/brand/components/sal/icon";
import { iconData } from "@repo/brand/components/sal/icon-data";
import type { Meta, StoryObj } from "@storybook/react";
import tokens from "../assets/tokens.json";

/**
 * Foundations, read from packages/brand/assets/tokens.json: the one source
 * the design system's tokens.css is generated from (`bun run --cwd
 * packages/brand tokens`), so the site and this page never differ.
 */
const meta = {
  title: "Foundations",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Token {
  name: string;
  usage: string;
  value: string | Record<string, string>;
}

const Row = ({
  children,
  name,
  usage,
}: {
  children?: React.ReactNode;
  name: string;
  usage: string;
}) => (
  <li className="border-line grid grid-cols-[5rem_10rem_1fr] items-start gap-4 border-t py-4">
    {children ?? <span />}
    <code className="font-mono text-sm">{name}</code>
    <span className="text-text-secondary text-sm">{usage}</span>
  </li>
);

const Swatch = ({ color }: { color: string }) => (
  <span
    className="border-line block h-12 w-20 border"
    style={{ background: color }}
  />
);

const colorTokens = tokens.color.tokens as Token[];
const brandColors = colorTokens.filter((t) => typeof t.value === "string");
const roles = colorTokens.filter((t) => typeof t.value !== "string");
const hex = new Map(brandColors.map((t) => [t.name, t.value as string]));
/** A role's value in one mode: "{white}" names a brand color. */
const resolve = (t: Token, mode: string) => {
  const v = typeof t.value === "string" ? t.value : (t.value[mode] ?? "");
  return hex.get(v.replace(/[{}]/gu, "")) ?? v;
};

/** The six colors, the reserved two, and the roles components use. */
export const Color: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-10">
      <ul>
        {brandColors.map((t) => (
          <Row key={t.name} name={`${t.name} ${t.value}`} usage={t.usage}>
            <Swatch color={t.value as string} />
          </Row>
        ))}
      </ul>
      <section>
        <h2 className="type-heading mb-4">Roles, light and dark</h2>
        <ul>
          {roles.map((t) => (
            <Row key={t.name} name={t.name} usage={t.usage}>
              <span className="flex">
                <Swatch color={resolve(t, "light")} />
                <Swatch color={resolve(t, "dark")} />
              </span>
            </Row>
          ))}
        </ul>
      </section>
    </div>
  ),
};

interface TypeStyle {
  fontSize: string;
  fontWeight: number;
  letterSpacing?: string;
  lineHeight: number;
  name: string;
  sample: string;
  usage: string;
}

const families = tokens.type.families as Record<string, string>;

/** Every type style, in its own size, with what it is for. */
export const Type: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-12">
      {tokens.type.groups.map((group) => {
        const ar = group.name === "Arabic";
        return (
          <section dir={ar ? "rtl" : undefined} key={group.name}>
            <h2 className="type-heading mb-4" dir="ltr">
              {group.name}
            </h2>
            <ul>
              {(group.styles as TypeStyle[]).map((s) => (
                <li className="border-line border-t py-5" key={s.name}>
                  <p
                    lang={ar ? "ar" : undefined}
                    style={{
                      fontFamily:
                        families[
                          (group as { family?: string }).family ?? "sans"
                        ],
                      fontSize: `min(${s.fontSize}, 12vw)`,
                      fontWeight: s.fontWeight,
                      letterSpacing: s.letterSpacing,
                      lineHeight: s.lineHeight,
                    }}
                  >
                    {s.sample}
                  </p>
                  <p
                    className="text-text-secondary mt-2 text-sm"
                    dir="ltr"
                    lang="en"
                  >
                    <code className="font-mono">{s.name}</code> · {s.fontSize},{" "}
                    {s.fontWeight} · {s.usage}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  ),
};

/** The spacing scale, the two radii, the hairline and the motion tokens. */
export const SpaceAndShape: Story = {
  name: "Space and shape",
  render: () => (
    <div className="grid max-w-4xl gap-10">
      <ul>
        {tokens.spacing.tokens.map((t) => (
          <Row key={t.name} name={`${t.name} ${t.value}`} usage={t.usage}>
            <span
              className="bg-text block h-3"
              style={{ width: `min(${t.value}, 5rem)` }}
            />
          </Row>
        ))}
      </ul>
      <ul>
        {[
          ...tokens.radius.tokens,
          ...tokens.stroke.tokens,
          ...tokens.motion.tokens,
        ].map((t) => (
          <Row key={t.name} name={`${t.name} ${t.value}`} usage={t.usage} />
        ))}
      </ul>
    </div>
  ),
};

/**
 * The icon set (packages/brand/assets/icons): Lucide redrawn at 1.5 px
 * with square ends, one meaning each, in the text's color.
 */
export const Icons: Story = {
  render: () => (
    <ul className="grid max-w-4xl grid-cols-2 gap-x-6 sm:grid-cols-4">
      {(Object.keys(iconData) as IconName[]).map((name) => (
        <li
          className="border-line flex items-center justify-between gap-3 border-t py-3 text-sm"
          key={name}
        >
          <span className="flex items-center gap-3">
            <Icon className="text-2xl" name={name} />
            {name}
          </span>
          <a
            className="text-text-secondary underline"
            download
            href={`brand-kit/icons/icon-${name}.svg`}
          >
            SVG
          </a>
        </li>
      ))}
    </ul>
  ),
};
