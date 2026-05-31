import type { Preview } from '@storybook/react';
// Import the compiled CSS from your UI package
import '@auibsal/ui/styles/globals.css'; 

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Enforce a brutalist dark/light mode toggle in the Storybook UI
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#000000' },
      ],
    },
  },
};

export default preview;
