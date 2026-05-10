
export default async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    node_version: process.version,
    has_fetch: typeof fetch !== 'undefined',
    message: 'Agora sim! O formato ES Module resolveu o crash inicial.'
  });
}
