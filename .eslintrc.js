module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Code style
    indent: ['error', 2],
    'no-console': 'off',
    'linebreak-style': ['error', 'unix','windows','linux'],
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

    semi: ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',

    // Best practices
    // 'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-multiple-empty-lines': ['error', { max: 2 }],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Node.js specific
    'no-process-exit': 'error',
    'handle-callback-err': 'error'
  }
};
