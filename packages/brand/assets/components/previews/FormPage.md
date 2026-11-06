# FormPage

The standard form page: every Society form that members, guests, parents, partners and contributors fill lives at auibsal.org/forms/F-xx, on this one layout (decided Nov 7). The site keeps the signed copy; staff forms are Notion templates; paper is only a backup.

**Markup:** `<form class="sal-formpage">`, containing:
- The `sal-form__head` from FormHeader: the code (SAL-EXB-01 · F-xx) and a Light title, then `p.sal-formpage__purpose`: one sentence on what the form is for and who reads it.
- `.sal-formpage__fields`: fields in one column, each `.sal-formpage__field` with `label.sal-formpage__label`, an `input.sal-formpage__input` (a single ink rule, no box) and an optional `p.sal-formpage__hint`. Choices are a vertical list: `.sal-formpage__choices` of `label.sal-formpage__choice`.
- `fieldset.sal-formpage__sign`: "Type your full name to sign" over `input.sal-formpage__signature`, one line saying the typed name is the signature, and the date filled in.
- `button.sal-formpage__button`: the one solid button, "Sign and send". Under it, one line on what happens next and where the signed copy is kept.

**Rules**
- One column; labels are nouns in sentence case; never a question as a label.
- Typed-name signatures are valid (E-SIGN and UETA); the date is filled in by the site, never typed.
- In the form's language: Arabic forms mirror the layout, with the button «وقّع وأرسل».
- In code: `FormPage` and `FormField` from `@repo/brand/components/sal/form-page`.
