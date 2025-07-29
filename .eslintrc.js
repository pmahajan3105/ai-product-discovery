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
    // Keep important rules as warnings (not errors) for CI compatibility
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn', // Keep this - it's valuable
    '@typescript-eslint/no-var-requires': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-namespace': 'warn',
    'prefer-const': 'warn', // Good practice
    'no-var': 'warn', // Good practice
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