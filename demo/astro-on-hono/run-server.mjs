import { Hono } from 'hono';
import { handler as ssrHandler } from './dist/server/entry.mjs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();

// Change this based on your astro.config.mjs, `base` option.
// They should match. The default value is "/".
app.use(ssrHandler);
app.use("/", serveStatic({ root: './dist/client/' }));

serve(app);