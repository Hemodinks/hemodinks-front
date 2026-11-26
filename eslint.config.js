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
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/refs': 'warn',
  'react-hooks/purity': 'warn',
  'react-hooks/immutability': 'warn',
  'react-hooks/exhaustive-deps': 'warn',
  // Acessibilidade: cada caso muda papel, foco ou teclado e precisa de validação na UI.
  'jsx-a11y/no-noninteractive-tabindex': 'warn',
  'jsx-a11y/no-static-element-interactions': 'warn',
  'jsx-a11y/no-noninteractive-element-interactions': 'warn',
  'jsx-a11y/label-has-associated-control': 'warn',
  'jsx-a11y/click-events-have-key-events': 'warn',
  'jsx-a11y/no-interactive-element-to-noninteractive-role': 'warn',
  'jsx-a11y/media-has-caption': 'warn',
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
      ...pendingRules,
    },
  },
);
