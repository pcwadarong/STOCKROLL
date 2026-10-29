import { describe, expect, it } from 'vitest';

import worker, { type Env } from './index';

const SHELL = '<!doctype html><div id="root"></div>';

const assets = (): Env & { requested: string[] } => {
  const requested: string[] = [];
  return {
    requested,
    ASSETS: {
      fetch: async input => {
        requested.push(new URL(input instanceof Request ? input.url : input).pathname);
        return new Response(SHELL, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        });
      },
    },
  };
};

const get = (path: string, env: Env) =>
  worker.fetch(new Request(`https://stockroll.test${path}`), env);

describe('worker', () => {
  it('when a script asks for a chunk that is gone, it must answer 404 rather than the app page', async () => {
    const env = assets();
    for (const path of ['/assets/index-old.js', '/assets/nope', '/workbox-old.js', '/nope.png']) {
      const response = await get(path, env);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('<div id="root">');
    }
    expect(env.requested).toEqual([]);
  });

  it('when a screen path is opened, it must get the app page, revalidated on every visit', async () => {
    const env = assets();
    const response = await get('/recipes/abc', env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(await response.text()).toBe(SHELL);
    expect(env.requested).toEqual(['/']);
  });
});
