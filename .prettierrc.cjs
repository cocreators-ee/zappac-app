module.exports = {
  printWidth: 100,
  trailingComma: "es5",
  useTabs: false,
  tabWidth: 2,
  semi: false,
  singleQuote: false,
  endOfLine: "lf",
  proseWrap: "always",
  plugins: [require("prettier-plugin-svelte")],
  overrides: [
    {
      files: "*.yaml",
      options: {
        proseWrap: "preserve",
      },
    },
    {
      files: "*.svelte",
      options: {
        proseWrap: "preserve",
      },
    },
  ],
}
