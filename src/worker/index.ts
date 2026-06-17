// The Sequence Viewer is a fully client-side tool — static assets are served
// directly by Cloudflare (see wrangler.json `assets`). This Worker only
// provides a tiny health endpoint; everything else falls through to the SPA.
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) =>
	c.json({ ok: true, app: "martal-sequence-viewer" }),
);

export default app;
