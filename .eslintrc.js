module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-namespace': 'warn',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'no-case-declarations': 'warn',
    'no-control-regex': 'warn',
    'no-undef': 'warn',
    'no-useless-escape': 'warn'
  },
  env: {
    node: true,
    browser: true,
    es2022: true,
    jest: true
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/'
  ]
};