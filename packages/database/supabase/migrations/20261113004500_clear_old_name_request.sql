-- The owner's ask: clear the official-name request queued on Nov 12, 2026
-- before the President's temporary exemption from a second officer
-- (20261113004400). The name is entered again from Membership and takes
-- effect at once; this request is marked declined, as if another officer
-- had declined it. Nothing else changes; a no-op where the row is absent.
update governance.pending_actions
set status = 'declined', decided_at = now()
where id = '8a59941b-ea46-4797-b777-96091340afdd'
  and kind = 'legal_name'
  and status = 'pending';
