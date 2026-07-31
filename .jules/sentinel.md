## 2026-07-31 - Privilege Escalation via user_metadata
**Vulnerability:** using user_metadata for role extraction.
**Learning:** user_metadata can be modified by authenticated clients via API.
**Prevention:** Extract roles exclusively from app_metadata.
