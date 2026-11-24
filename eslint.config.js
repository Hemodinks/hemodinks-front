// ESLint (#264): regras de hooks e de acessibilidade estática que o `tsc` não cobre.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Introdução gradual: regras com violações já existentes ficam como aviso até o #292
// corrigi-las. O script `lint` usa --max-warnings para impedir avisos novos.
const pendingRules = {
  // Regras do React Compiler (eslint-plugin-react-hooks 7): corrigir exige revisar cada efeito.
  // #292 fase 1 zerou purity, immutability, exhaustive-deps e as de acessibilidade (voltaram a ser erro).
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/refs': 'warn',
};

export default defineConfig(
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Timers declarados antes do closure que os limpa e atribuídos depois (useBootstrapRequest).
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      // Rótulo com o texto dentro de um título (<label><div><h3>…</h3></div><input/></label>, preferências de cookies).
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
      ...pendingRules,
    },
  },
);
