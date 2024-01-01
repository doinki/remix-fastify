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
  build: ServerBuild | (() => Promise<ServerBuild>);
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    let remixRequest = createRemixRequest(request, reply);
    let loadContext = await getLoadContext?.(request, reply);

    let remixResponse = await handleRequest(remixRequest, loadContext);

    await sendRemixResponse(reply, remixResponse);
  };
}

export function createRemixHeaders(
  requestHeaders: FastifyRequest['headers']
): Headers {
  let headers = new Headers();

  for (let [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

export function createRemixRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Request {
  let controller = new AbortController();
  reply.raw.on('close', () => controller.abort());

  let init: RequestInit & { duplex?: 'half' } = {
    headers: createRemixHeaders(request.headers),
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

export async function sendRemixResponse(
  reply: FastifyReply,
  nodeResponse: Response
): Promise<void> {
  reply.raw.statusCode = nodeResponse.status;

  for (let [key, value] of nodeResponse.headers.entries()) {
    reply.raw.setHeader(key, value);
  }

  if (nodeResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
    reply.raw.flushHeaders();
  }

  if (nodeResponse.body) {
    await writeReadableStreamToWritable(nodeResponse.body, reply.raw);
  } else {
    reply.raw.end();
  }
}
