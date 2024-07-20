import { extension } from 'esbuild-plugin-extension';
import { defineConfig } from 'tsup';

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ['src/**/*.ts'],
  esbuildPlugins: [extension()],
  format: ['cjs', 'esm'],
  sourcemap: true,
  target: 'node18',
  treeshake: true,
});
