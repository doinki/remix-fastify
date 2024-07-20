import { PassThrough } from 'node:stream';

import {
  type AppLoadContext,
  createReadableStreamFromReadable,
  createRequestHandler as createRemixRequestHandler,
  type ServerBuild,
  writeReadableStreamToWritable,
} from '@remix-run/node';
import { type FastifyReply, type FastifyRequest } from 'fastify';

export interface GetLoadContextFunction {
  (request: FastifyRequest, reply: FastifyReply):
    | Promise<AppLoadContext>
    | AppLoadContext;
}

export interface RequestHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<void>;
}

export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {
  const handleRequest = createRemixRequestHandler(build, mode);

  if (getLoadContext) {
    return async (request, reply) => {
      await sendRemixResponse(
        reply,
        await handleRequest(
          createRemixRequest(request, reply),
          await getLoadContext(request, reply)
        )
      );
    };
  }

  return async (request, reply) => {
    await sendRemixResponse(
      reply,
      await handleRequest(createRemixRequest(request, reply))
    );
  };
}

function createRemixRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Request {
  const controller = new AbortController();
  reply.raw.on('close', () => {
    controller.abort();
  });

  const init: RequestInit & { duplex?: 'half' } = {
    headers: new Headers(request.headers as any),
    method: request.method,
    signal: controller.signal,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = createReadableStreamFromReadable(request.raw);
    init.duplex = 'half';
  }

  return new Request(
    `${request.protocol}://${request.hostname}${request.url}`,
    init
  );
}

async function sendRemixResponse(reply: FastifyReply, nodeResponse: Response) {
  reply.code(nodeResponse.status);

  for (const [key, value] of nodeResponse.headers.entries()) {
    reply.header(key, value);
  }

  if (nodeResponse.body) {
    const passThrough = new PassThrough();

    reply.send(passThrough);

    await writeReadableStreamToWritable(nodeResponse.body, passThrough);
  } else {
    reply.send();
  }
}
