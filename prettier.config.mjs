/** @type {import('prettier').Config} */
const config = {
  // Base formatting
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  bracketSpacing: true,

  // Plugins
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],

  // Import Sorting Configuration
  importOrder: [
    '^(react/(.*)$)|^(react$)',
    '^(next/(.*)$)|^(next$)',
    '<THIRD_PARTY_MODULES>',
    '^@auibsal/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // Tailwind Configuration (Allows Prettier to read your v4 classes)
  tailwindConfig: './packages/config/theme.css',
  tailwindFunctions: ['clsx', 'cva', 'cn'],
};

export default config;
