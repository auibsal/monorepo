## 2025-02-14 - pnpm Lockfile Overwrites
**Learning:** Running Scope: all 7 workspace projects
 WARN  Ignoring broken lockfile at /app: Lockfile /app/pnpm-lock.yaml not compatible with current pnpm
Progress: resolved 0, reused 1, downloaded 0, added 0
Progress: resolved 121, reused 102, downloaded 0, added 0
Progress: resolved 635, reused 508, downloaded 0, added 0
 WARN  2 deprecated subdependencies found: node-domexception@1.0.0, uuid@9.0.1
Progress: resolved 944, reused 821, downloaded 0, added 0
Already up to date
Progress: resolved 944, reused 821, downloaded 0, added 0, done
 WARN  Issues with peer dependencies found
.
├─┬ eslint-plugin-import 2.32.0
│ └── ✕ unmet peer eslint@"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9": found 10.4.0
└─┬ eslint-config-next 16.2.6
  ├─┬ eslint-plugin-import 2.32.0
  │ └── ✕ unmet peer eslint@"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9": found 10.4.0
  ├─┬ eslint-plugin-jsx-a11y 6.10.2
  │ └── ✕ unmet peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9": found 10.4.0
  └─┬ eslint-plugin-react 7.37.5
    └── ✕ unmet peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7": found 10.4.0

Done in 4.2s using pnpm v10.33.2 with a newer version of pnpm can unintentionally update the `pnpm-lock.yaml` format (e.g., from v6 to v9), which might break CI environments relying on an older pnpm version.
**Action:** Always check `git status` after installing dependencies or running linters, and revert any unintended `pnpm-lock.yaml` changes.
