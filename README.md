# remix-fastify

```js
import Fastify from 'fastify';
import { createRequestHandler } from 'remix-server/fastify';

const fastify = Fastify();

fastify.all(
  '*',
  createRequestHandler({
    build: () => import('./build/server/index.js'),
  })
);

await fastify.listen({ port: 3000 });
```
