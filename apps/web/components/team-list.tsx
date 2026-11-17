/**
 * The one team list (decisions.md, The Council and the roles: "How teams
 * are shown"): a group's heading, then each person by title and the name
 * they go by. The Council page, Our people, the Qirtas masthead, Next
 * Stop's credits, a production's playbill and an event's team all draw
 * from it.
 */
interface TeamMember {
  readonly key: string;
  /** Empty when the place is open. */
  readonly name: string | null;
  /** What an empty place says instead of "Open" ("Covered by …"). */
  readonly note?: string;
  readonly title: string;
}

export interface TeamGroup {
  readonly heading?: string;
  readonly key: string;
  readonly members: readonly TeamMember[];
}

export const TeamList = ({
  groups,
  open,
}: {
  readonly groups: readonly TeamGroup[];
  /** What an open place says ("Open"). */
  readonly open: string;
}) => (
  <div className="grid gap-12">
    {groups.map((group) => (
      <section className="grid gap-3" key={group.key}>
        {group.heading ? (
          <h2 className="type-heading">{group.heading}</h2>
        ) : null}
        <dl className="border-line grid border-b">
          {group.members.map((member) => (
            <div
              className="border-line grid gap-1 border-t py-3 sm:grid-cols-[16rem_1fr] sm:gap-x-6"
              key={member.key}
            >
              <dt className="type-caption text-text-secondary">
                {member.title}
              </dt>
              <dd
                className={
                  member.name ? "type-body" : "type-body text-text-secondary"
                }
              >
                {member.name ?? member.note ?? open}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    ))}
  </div>
);
