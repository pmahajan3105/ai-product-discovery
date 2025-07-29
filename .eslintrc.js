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
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'prefer-const': 'off',
    'no-var': 'off',
    'no-case-declarations': 'off',
    'no-control-regex': 'off',
    'no-undef': 'off',
    'no-useless-escape': 'off'
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