-- Qirtas is the Society's paper, not a program (SAL-BRD-01, Version 1;
-- NAMES.md): its row leaves every list of programs. Unpublished, not
-- deleted, so its history, roles and links stay.
update core.programmes set is_active = false where slug = 'waraq';
