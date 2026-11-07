# Backups and restore

What is backed up, where, for how long, and how to bring it back.

The Supabase project is on the Free plan, which keeps no downloadable backups. The Society’s own backup is a GitHub Actions workflow (`.github/workflows/backup.yml`).

| What | When | Kept | Where |
| --- | --- | --- | --- |
| Roles, schema and data of the production database | Nightly at 23:20 UTC (2:20 a.m. Baghdad) | 30 days | GitHub → Actions → **Back up production database** → the run’s artifact, and a second copy in Cloudflare R2 |
| Every Storage bucket (submissions, the library, Tour pages, media) | The same run on the 1st of each month, or a manual run with “Also back up the Storage buckets” | 30 days in GitHub; in R2 by its lifecycle rule (set it to 12 months) | The same two places, in the same file |

Each backup is encrypted (GPG, AES-256) with `BACKUP_PASSPHRASE` before it leaves the runner, because the repository is public; the passphrase reaches GPG through standard input, never the command line. Without the passphrase the file is useless, so keep it in the password manager as well as in GitHub.

## Secrets (GitHub → production environment)

| Name | What |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | Reach the project |
| `BACKUP_PASSPHRASE` | Encrypts the file (the run fails without it) |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | The second copy: a private R2 bucket and a token that can only write to it. Without them the run warns and keeps the GitHub copy only |
| `RESEND_TOKEN` | Emails hello@auibsal.org when a run fails |

The project ref comes from the repository variable `SUPABASE_PROJECT_REF`.

## Restore

Practice this on a scratch Supabase project first. Restoring over production replaces live data; decide it with the President and record it in the minutes.

1. **Download and decrypt.** Download the artifact `sal-backup-YYYY-MM-DD` (or the file from R2), then:

   ```sh
   gpg --decrypt sal-YYYY-MM-DD.tar.gz.gpg > sal.tar.gz
   tar -xzf sal.tar.gz   # roles.sql, schema.sql, data.sql, and storage/ on the 1st
   ```

2. **Restore the database.** Use the target project’s connection string (Project Settings → Database):

   ```sh
   psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 \
     -f roles.sql -f schema.sql \
     -c "SET session_replication_role = replica" \
     -f data.sql
   ```

3. **Restore Storage** (when the file has `storage/`), one bucket at a time, linked to the target project:

   ```sh
   bunx supabase --experimental storage cp -r storage/<bucket> ss:///<bucket> --linked
   ```

4. **Check.** Sign in to a Diwan pointed at the target, open a member, an event and a submission, and compare row counts with the source.

## The quarterly restore test

Once a term (September, January, April and June), the General Secretary or whoever keeps the platform restores the latest backup with Storage into a scratch Supabase project, following the steps above, and checks that:

- the restore runs with no errors;
- the row counts of `core.profiles`, `events.events`, `journal.pieces` and `governance.minutes` match production’s on the backup’s date;
- a file from each bucket opens.

Record the date and result in Notion (the Diwan → Platform), then delete the scratch project.
