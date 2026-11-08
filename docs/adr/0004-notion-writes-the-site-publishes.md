# 0004. Notion is where the work is written; the site publishes it

Status: Accepted

## Context

Officers plan and write in Notion. Copying events, news and documents into
the Diwan by hand kept two versions that drifted apart.

## Decision

Events, news, documents, minutes and the content calendar are written in
Notion and copied to the site by the sync (`lib/api/notion`, every 15
minutes). The Diwan shows them read-only and keeps only the site's own
parts. Personal data never goes to Notion.

## Consequences

Renaming a Notion property breaks the sync unless the code changes with
it. The site works with whatever was last synced if Notion is down.
