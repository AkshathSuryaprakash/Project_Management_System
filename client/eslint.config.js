// Core JavaScript rules
import js from '@eslint/js'

// Browser global variables (window, document, etc.)
import globals from 'globals'

// React hooks linting rules (ensures correct hook usage)
import reactHooks from 'eslint-plugin-react-hooks'

// Vite hot reload linting rules
import reactRefresh from 'eslint-plugin-react-refresh'

// TypeScript linting rules
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Ignore the build output folder - no need to lint compiled code
  { ignores: ['dist'] },
  {
    // Extend recommended rulesets for JS and TypeScript
    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    // Only lint TypeScript files (.ts and .tsx)
    files: ['**/*.{ts,tsx}'],

    languageOptions: {
      // Support modern JavaScript syntax (ES2020)
      ecmaVersion: 2020,

      // Allow browser globals (window, document, console, etc.)
      globals: globals.browser,
    },

    plugins: {
      // Enable React hooks linting
      'react-hooks': reactHooks,

      // Enable Vite fast refresh linting
      'react-refresh': reactRefresh,
    },

    rules: {
      // React hooks rules:
      // - Don't call hooks inside conditions/loops
      // - Correct useEffect dependency array
      ...reactHooks.configs.recommended.rules,

      // Warns if you export non-components from a file
      // (This can break Vite's hot reload / fast refresh)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
