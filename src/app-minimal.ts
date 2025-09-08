import express from 'express';
const app = express();

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

export default app;
