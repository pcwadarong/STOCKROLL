/** Bindings declared in wrangler.jsonc. */
export interface Env {
  ASSETS: { fetch(input: URL | Request): Promise<Response> };
}

// A path that names a file rather than a screen. The app's routes have no dots and nothing under /assets.
const isFilePath = (pathname: string) =>
  pathname.startsWith('/assets/') || /\.[^/]*$/.test(pathname);

/**
 * Handles every request that matches no static file: screen paths get the app page, and file paths
 * get 404. Existing files are served before this code runs.
 */
const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    // HTML in place of a missing chunk fails as a syntax error and hides the deploy from the app-update check.
    if (isFilePath(pathname)) return new Response('Not found', { status: 404 });

    const shell = await env.ASSETS.fetch(new URL('/', request.url));
    const headers = new Headers(shell.headers);
    // public/_headers does not apply to responses built here.
    headers.set('Cache-Control', 'no-cache');
    return new Response(shell.body, { status: shell.status, headers });
  },
};

export default worker;
