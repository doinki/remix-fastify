import { statSync } from 'node:fs';
import { join, sep } from 'node:path';

import { defineConfig } from 'tsup';

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch (err) {
    return false;
  }
}

export default defineConfig([
  {
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],
    esbuildPlugins: [
      {
        name: 'extension',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (
              args.importer &&
              (args.path.startsWith(`.${sep}`) ||
                args.path.startsWith(`..${sep}`))
            ) {
              if (isDirectory(join(args.resolveDir, args.path))) {
                return {
                  external: true,
                  path: `${args.path}${sep}index.js`,
                };
              }

              return {
                external: true,
                path: `${args.path}.js`,
              };
            }
          });
        },
      },
    ],
    format: 'esm',
    sourcemap: true,
    target: 'node18',
    treeshake: true,
  },
  {
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],
    esbuildPlugins: [
      {
        name: 'extension',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (
              args.importer &&
              (args.path.startsWith(`.${sep}`) ||
                args.path.startsWith(`..${sep}`))
            ) {
              if (isDirectory(join(args.resolveDir, args.path))) {
                return {
                  external: true,
                  path: `${args.path}${sep}index.cjs`,
                };
              }

              return {
                external: true,
                path: `${args.path}.cjs`,
              };
            }
          });
        },
      },
    ],
    format: 'cjs',
    sourcemap: true,
    target: 'node18',
    treeshake: true,
  },
]);
