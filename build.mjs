import { build } from 'esbuild';
import { copyFileSync } from 'fs';
await build({ entryPoints: ['src/card.js'], bundle: true, format: 'esm', minify: true, target: 'es2021', outfile: 'dist/garage-for-tesla-card.js', legalComments: 'eof' });
copyFileSync('src/model3.glb', 'dist/garage-for-tesla-model3-highland.glb');
copyFileSync('src/model3_classic.glb', 'dist/garage-for-tesla-model3-classic.glb');
copyFileSync('src/modely_juniper.glb', 'dist/garage-for-tesla-modely-juniper.glb');
copyFileSync('src/modely_classic.glb', 'dist/garage-for-tesla-modely-classic.glb');
await build({ entryPoints: ['test/harness.js'], bundle: true, format: 'esm', target: 'es2021', outfile: 'test/harness.bundle.js', minify: true, supported: { 'top-level-await': true }, logLevel: 'error' });
console.log('ok');
