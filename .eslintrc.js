module.exports = {
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
},
"env": {
  "browser": true,
  "node": true,
  "es6": true
},
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/errors",
    "plugin:import/warnings"
  ],
  rules: {
    'no-console': 'off',
  },
};
