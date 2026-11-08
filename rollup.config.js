import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import css from 'rollup-plugin-import-css';
import { buildTranslations } from 'translations';

const isProduction = process.env.BUILD === 'production';
const doTranslations = process.env.TRANSLATIONS === 'true';

const BUILD_OPTIONS = [
	{ mode: 0, output: "application.js" },
];

const BUILDS = [];

if (doTranslations) {
	console.info('Building translations');
	await buildTranslations('./src/client/json/i18n/translations.json', './src/client/json/i18n/', undefined, '\t');
}

for (const buildOption of BUILD_OPTIONS) {
	BUILDS.push(
		{
			input: './src/client/ts/application.ts',
			output: {
				file: `./build/client/js/${buildOption.output}`,
				format: 'esm'
			},
			plugins: [
				replace({
					preventAssignment: true,
					__isProduction__: isProduction,
				}),
				css(),
				json({
					compact: true,
				}),
				//image(),
				typescript({ compilerOptions: { target: 'es2023' } }),
				/*
				commonjs({
				}),
				*/
				nodeResolve({
				}),
				//isProduction ? terser() : null,
				copy({
					copyOnce: true,
					targets: [
						{ src: 'src/client/index.html', dest: 'build/client/' },
						/*
						{ src: 'src/client/json/', dest: 'build/client/' },
						*/
					]
				}),
			],
			onwarn: function onwarn(warning, warn) {
				// Disable circular dependencies in modules
				if (warning.code == 'CIRCULAR_DEPENDENCY' && warning.importer && warning.importer.startsWith('node_modules/')) {
					return;
				}
				warn(warning);
			},
		}
	)
}

export default BUILDS;
