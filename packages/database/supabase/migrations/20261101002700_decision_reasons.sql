-- C25 (the design review, Nov 4, 2026): every decision on work sent to
-- Qirtas carries its reason. The readers' rubric and the decision are on
-- one page in the Diwan; the database refuses a decision without a reason,
-- blind or named alike. The reason is for the masthead's record; reading
-- stays blind (the decision is still made on the blind entry).

do $$
declare
  fn text;
  def text;
  guard text;
begin
  foreach fn in array array['private.decide', 'private.decide_named'] loop
    def := pg_get_functiondef(fn::regproc);
    guard := format(
      E'begin\n  if nullif(btrim(coalesce(%s.notes, %L)), %L) is null then\n    raise exception %L using errcode = %L;\n  end if;\n',
      split_part(fn, '.', 2), '', '', 'A decision needs its reason', '22023'
    );
    if position(E'\nbegin\n' in def) = 0 then
      raise exception 'Unexpected body in %', fn;
    end if;
    def := overlay(def placing E'\n' || guard
      from position(E'\nbegin\n' in def) for length(E'\nbegin\n'));
    execute def;
  end loop;
end
$$;
