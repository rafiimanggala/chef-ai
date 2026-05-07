import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { health } from '../../routes/health.js';

const app = new Hono();
app.route('/health', health);

describe('Health endpoint', () => {
  it('GET /health returns ok', async () => {
    const res = await app.fetch(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
