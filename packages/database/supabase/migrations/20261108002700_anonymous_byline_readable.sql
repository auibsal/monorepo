-- The piece page reads whether a byline is Anonymous, to name the Society
-- as the author in NewsArticle data (audit C7). The byline already reads
-- "Anonymous"; the flag says nothing more, and user_id stays unreadable.
grant select (is_anonymous) on journal.contributors to anon, authenticated;
