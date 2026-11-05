-- Mohammed-Ali's name as he wrote it himself (owner, Nov 5, 2026).
-- Migration 20261101002200 overwrote three of his English parts (first,
-- father's, last) with a form that was not his: his own Arabic name,
-- unchanged, is «محمد … جاسم». Nothing kept the English he typed, so those
-- three parts are cleared rather than guessed: without all eight parts he
-- is asked for them at his next sign-in (/welcome), in his own hand. His
-- grandfather's part and his four Arabic parts were never changed and stay.
-- His shown name is kept until he writes the parts.

update core.profiles
set first_name_en = null,
    father_name_en = null,
    last_name_en = null
where id = '9fbe017b-1330-4bfa-bc42-fb0941e2330c';
