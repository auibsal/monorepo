import type { Meta, StoryObj } from "@storybook/react";
import manifest from "../assets/video/manifest.json";

/**
 * The kit's sound and video files (decisions.md, Brand and design: Video):
 * the sound logo as a WAV, kept in the kit, and its clips, kept out of git
 * in a private bucket and downloaded by staff through the site. Next
 * Stop's package and the launch film are added once approved.
 */
const meta = {
  title: "Foundations/Sound and video",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const href = (file: (typeof manifest.files)[number]) =>
  file.where === "kit" && "path" in file
    ? `brand-kit/${file.path}`
    : `/api/brand-kit/${file.file}`;

export const Files: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-6">
      <p className="text-text-secondary">{manifest.about}</p>
      <ul className="border-line grid border-b">
        {manifest.files.map((file) => (
          <li className="border-line grid gap-1 border-t py-3" key={file.file}>
            <span className="font-medium">{file.name}</span>
            <span className="text-text-secondary text-sm">{file.format}</span>
            <a className="text-sm underline" download href={href(file)}>
              {file.file}
            </a>
          </li>
        ))}
      </ul>
      <div className="grid gap-2">
        <p className="font-medium">Still in review</p>
        <ul className="text-text-secondary list-inside text-sm">
          {manifest.inReview.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  ),
};
