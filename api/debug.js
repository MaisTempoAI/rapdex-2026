
module.exports = async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    node_version: process.version,
    has_fetch: typeof fetch !== 'undefined',
    env_keys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN')),
    message: 'Se você está vendo isso, as APIs do Vercel estão funcionando. O erro 500 nas outras funções provavelmente é falta de variáveis de ambiente obrigatórias.'
  });
};
