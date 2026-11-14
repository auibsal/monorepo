# Documents and forms

Every Society document is a Notion page in two editions, English and Arabic, linked to each other. When a printed or emailed copy is needed, it is exported from that page, never stored, and built from the same parts, so it looks like ours on the first try. The parts are in Components → Brand (Document, Form).

- **Two editions, one language each:** an English document is English only. The Arabic edition is its own document, mirrored, with the Arabic lockup. Codes stay in Latin letters.
- **Cover:** the lockup at the top start; the code in Ubuntu Mono at the top end; title in Light, ink; one sentence; "Prepared by"; a hairline footer with the date and status ("Version 1, proposed" until the Founding Meeting). No ribbon, no band. Always light.
- **Contents:** numbered rows with hairlines; no band.
- **Section pages:** a one- or two-word Light title, one sentence, then content. Nothing above the title.
- **Legal text:** two columns; articles numbered in Ubuntu Mono; clause numbers in the margin.
- **Footers:** every page but the cover; a hairline, code and title at left, "3 / 14" at right (spaced slash, no "Page").
- **The end:** a document ends with its last section. "Thank you." closes only printed pieces: decks, printed programs and the Edition.

## Codes

Each family is a Council seat; GOV is the members' own. 01 is the family's general manual, the one the next holder takes over; 02 and up are its programs. Two digits; codes are never reused.

| Family | Owner | Documents |
| --- | --- | --- |
| SAL-GOV | The members (kept by the Secretary) | 01 Constitution, 02 Bylaws, 03 Policy Manual, 04 Privacy Notice, 05 Terms of Use, 06 Accessibility Statement |
| SAL-EXB | The Executive Board | 01 Leadership Handbook (with the forms register), 02 Annual Plan |
| SAL-EVT | Director of Events | 01 Events Manual |
| SAL-MEM | Director of Membership | 01 Membership Manual, 02 Member Handbook, 03 Typewriter Tour Playbook |
| SAL-PTN | Director of Partnerships | 01 Partnerships Manual, 02 Second Chapter Playbook |
| SAL-MED | Director of Media | 01 Media Manual, 02 Brand and Identity (this guide), 03 Next Stop Show Bible |
| SAL-ART | Artistic Director | 01 Arts Manual, 02 The Company Production Handbook |
| SAL-EDT | Editor-in-Chief | 01 Editorial Standards and Stylebook, 02 Qirtas Staff Manual, 03 Qalam Program Handbook, 04 Mutanabbi Prize Rules |

Records (minutes, reports, the Founding Proposal) carry no code.

## Forms

Forms are digital by default. Every form is in the Leadership Handbook's register as **SAL-EXB-01 · F-xx**, and each says where it is filled.

- **On the site:** members, guests, parents, partners and contributors fill a form on one standard page, auibsal.org/forms/F-xx, and sign by typing their name; the site keeps the signed copy. Where the site already does the job (joining, RSVPs, Write for Qirtas, Get involved, elections, staff hours), the form is part of that page.
- **In Notion:** staff forms are templates (meetings and minutes, debriefs, needs, handover).
- **On paper, only as a backup:** a printed copy of the same form, photographed into the record the same day, and the two-person cash count at a charity collection.

**The form page** (Components → Brand, Form page)

- The code in Ubuntu Mono (SAL-EXB-01 · `media-release`) and a Light title, then one sentence on what the form is for and who reads it.
- Fields in one column. Labels are nouns in sentence case ("Date", "Proposed by"), never questions; a field that counts says what it counts ("Expected attendance"). Choices are a vertical list.
- The signature: "Type your full name to sign", the date filled in, and one line saying the typed name is the signature.
- One solid button, "Sign and send"; after sending, the page says what happens next and where the signed copy is kept.
- In the form's language: Arabic forms mirror the layout.

**The printed backup** is the same page printed from the browser: the code and Light title above an ink hairline, the symbol at the top end, the fields, and the footer. The button drops out; there is no office-use strip. Titles are in sentence case ("Photo release", not "Photo Release").

## One source for forms, letters, cards and certificates

Each is designed once (decided Nov 7: one template, many outputs). Its words live in the forms register in Notion; the site renders the design; a printed or PDF copy is the same page printed from the browser. Nothing is drawn separately, and the printables keep only what exists only on paper (name badges, the photography notice, the sticker pack). The form and the letter are components in the brand kit. The membership card and the certificate are the live site's designs, which are the source: they move into the brand kit unchanged in look.

| Component | Where it appears | What it holds |
| --- | --- | --- |
| Form (`FormPage`, `FormHeader`) | auibsal.org/forms/F-xx; printed as a backup | Code SAL-EXB-01 · F-xx, a title in sentence case, one sentence on what it is for, the fields, a typed-name signature and the date |
| Letter (`Letter`) | Every letter: `appointment-letter`, `service-letter`, `thank-you-letter`, `application-outcome`, `welcome-letter`, `honorary-membership-invitation` | An American business letter, A4 portrait: the lockup; the date with no weekday ("November 7, 2026", «7 تشرين الثاني 2026»); the recipient; a subject line; the greeting with a colon ("Dear Mr. Najm:"), or a comma only in a personal letter to a member ("Dear Lina,"), in Arabic «السيد علي نجم المحترم،» or «عزيزتي لينا،»; the body; "Sincerely," («مع خالص التحية،»), then the signer's name and seat. At the foot the form code and the Society's addresses, and room for a verification code and QR (auibsal.org/verify/<code>), which service letters (`service-letter`) use |
| Membership card | Today in the member's account, and Google Wallet; never printed | The live site's card: the guilloche drawn from the card number (still), the live QR panel with its 30-second countdown, and the Google Wallet link. Name, member number, class (Member, Associate Member, Honorary Member) and member since. Never an "ID card": the AUIB ID is the university's |
| Certificate | Finishing Qalam; the Mutanabbi Prize (each category) | The live site's certificate: the rosette seal drawn from the serial and the QR to its check page, auibsal.org/verify/<code> |

No other certificates: service is a letter (`service-letter`) and honorary membership an invitation (`honorary-membership-invitation`).
