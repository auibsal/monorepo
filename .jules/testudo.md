## 2023-11-20 - Vitest execution friction in isolated packages
Discovery: Attempting to run \`vitest\` via \`pnpm --filter <pkg> exec vitest\` fails with "Command vitest not found" because \`vitest\` isn't explicitly listed in the package's devDependencies, and the Node engine requirement blocks installing it cleanly if there is a mismatch.
Strategy: Use \`pnpm --config.engine-strict=false dlx vitest run <file>\` to execute tests in packages that do not have vitest configured locally, or explicitly wire up the \`@auibsal/testing\` workspace config.
