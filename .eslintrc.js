module.exports = {
  root: true,
  globals: {
    AMap: true,
    AMapUI: true,
  },
  parser: "vue-eslint-parser",
  rules: {
    'no-console': 0,
    "parser": 0
},
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 7,
    sourceType: "module"
  }
}
