/** @type {import('prettier').Config} */
const config = {
  // Base formatting
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  printWidth: 100,
  bracketSpacing: true,
  endOfLine: 'lf',

  // Plugins
  // Note: prettier-plugin-tailwindcss MUST remain the last plugin in the array
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],

  // Import Sorting Configuration (@ianvs syntax)
  importOrder: [
    '^(react/(.*)$)|^(react$)',
    '^(next/(.*)$)|^(next$)',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@auibsal/(.*)$',
    '',
    '^@/(.*)$',
    '^[./]',
  ],
  // @ianvs handles separation via empty strings in the array above, but we keep TS parsing strict
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderTypeScriptVersion: '5.0.0',

  // Tailwind Configuration (v4 CSS Stylesheet)
  tailwindStylesheet: './packages/ui/src/styles/globals.css',
  tailwindFunctions: ['clsx', 'cva', 'cn'],
};

export default config;
