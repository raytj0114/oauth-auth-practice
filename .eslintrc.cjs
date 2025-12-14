// ESLint 設定ファイル
// CommonJS 形式（.cjs）を使用: package.json が "type": "module" のため

module.exports = {
  env: {
		node: true,
		es2022: true,
	},
	parserOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
	},
	extends: ['eslint:recommended'],
	rules: {
		// ===== エラー（必ず修正） =====
		'no-unused-vars': ['error', {
			argsIgnorePattern: '^_',  // _で始まる引数は無視
			varsIgnorePattern: '^_',  // _で始まる変数は無視
		}],
		'no-undef': 'error',
		'no-console': 'off',  // サーバーサイドなのでconsoleはOK
	
		// ===== 警告（推奨） =====
		'prefer-const': 'warn',
		'no-var': 'warn',
		'eqeqeq': ['warn', 'always', { null: 'ignore' }],

		// ===== スタイル（緩め） =====
		'semi': ['warn', 'always'],
		'quotes': ['warn', 'single', { avoidEscape: true }],
		'indent': 'off',  // Prettier に任せる場合は off
		'comma-dangle': 'off',
		'no-trailing-spaces': 'off',
	},
	ignorePatterns: [
		'node_modules/',
		'public/js/',  // クライアントサイド JS は別途設定が必要
		'*.min.js',
		'coverage/',
		'dist/',
	],
}