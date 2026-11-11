-- The checks for codes (decisions.md, The site): long random codes. New
-- certificates and service letters get 24 hex characters (96 random bits)
-- in place of 12 (48); codes already printed keep working.

alter table membership.certificates
  alter column verification_code set default encode(extensions.gen_random_bytes(12), 'hex');

alter table membership.service_letters
  alter column verification_code set default encode(extensions.gen_random_bytes(12), 'hex');
