## 2024-05-15 - ICS and CRLF Injection in Calendar Endpoints
**Vulnerability:** A custom calendar (`.ics`) generation endpoint did not properly sanitize input, potentially allowing CRLF injection or injection of arbitrary ICS properties.
**Learning:** ICS files use carriage returns (`\r\n`) and specific characters (`,`, `;`) for syntax. User input containing these characters could break the format or inject malicious properties.
**Prevention:** Strictly strip carriage returns (`\r`) and correctly escape commas (`,`), semicolons (`;`), and newlines (`\n`) for all user-supplied data embedded in `.ics` payloads.
