import next from "eslint-config-next"

// Next 16 поставляет flat-config напрямую (без FlatCompat).
const eslintConfig = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "drizzle/**"] },
]

export default eslintConfig
