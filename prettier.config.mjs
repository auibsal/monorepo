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
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],

  // Import Sorting Configuration
  importOrder: [
    '^(react/(.*)$)|^(react$)',
    '^(next/(.*)$)|^(next$)',
    '<THIRD_PARTY_MODULES>',
    '^@auibsal/(.*)$',
    '^@/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // Tailwind Configuration (Allows Prettier to read your v4 classes)
  tailwindConfig: './packages/ui/src/styles/globals.css',
  tailwindFunctions: ['clsx', 'cva', 'cn'],
};

export default config;
