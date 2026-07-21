/**
 * Vercel serverless entry. Deliberately plain JS: Vercel compiles TS functions with
 * esbuild, which does not emit the decorator metadata NestJS dependency injection
 * relies on. Instead the app is compiled by `nest build` (tsc) during the Vercel
 * build step, and this thin handler just requires the compiled output.
 *
 * vercel.json rewrites every path to this function; Express receives the original
 * req.url, so /api/v1/* and /docs route exactly as they do on a normal server.
 */
// nest build emits to dist/src/ because tsconfig's include spans prisma/ as well.
const { getServer } = require('../dist/src/vercel');

module.exports = async (req, res) => {
  const server = await getServer();
  return server(req, res);
};
