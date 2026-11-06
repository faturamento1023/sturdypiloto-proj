import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

// Substituto HTTP para testar a integração do SDK em loopback, sem contas ou e-mail reais.
const porta = 54329;
const chaveTeste = 'sb_publishable_piloto_teste';
const senhaInicial = 'Piloto-ficticio-123';
const codigoTeste = '081426';
const usuarios = new Map();
const acessos = new Map();
const renovacoes = new Map();
const codigos = new Set();
const desafios = new Map();

function novoFator(status) {
  return {
    id: randomUUID(), factor_type: 'totp', status, friendly_name: 'Autenticador fictício',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

for (const projeto of ['desktop', 'celular']) {
  for (const cenario of ['login', 'renovar', 'recuperar']) {
    const email = `${cenario}-${projeto}@example.com`;
    usuarios.set(email, {
      senha: senhaInicial,
      user: {
        id: randomUUID(), email, aud: 'authenticated', role: 'authenticated',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {}, is_anonymous: false, created_at: new Date().toISOString(),
        factors: cenario === 'login' ? [] : [novoFator('verified')],
      },
    });
  }
}

const base64url = valor => Buffer.from(JSON.stringify(valor)).toString('base64url');

function sessao(conta, { aal = 'aal1', expirada = false } = {}) {
  const agora = Math.floor(Date.now() / 1000);
  const exp = agora + (expirada ? -60 : 3600);
  const cabecalho = base64url({ alg: 'HS256', typ: 'JWT' });
  const dados = base64url({ sub: conta.user.id, iat: agora - 120, exp, jti: randomUUID(), role: 'authenticated', aal });
  const access_token = `${cabecalho}.${dados}.Zml4dHVyZQ`;
  const refresh_token = randomUUID();
  acessos.set(access_token, { conta, exp, refresh_token, aal });
  renovacoes.set(refresh_token, { conta, aal });
  return { access_token, refresh_token, expires_at: exp, expires_in: exp - agora, token_type: 'bearer', user: conta.user };
}

function json(resposta, status, dados) {
  resposta.writeHead(status, { 'Content-Type': 'application/json' });
  resposta.end(JSON.stringify(dados));
}

async function corpo(req) {
  let dados = '';
  for await (const parte of req) dados += parte;
  return dados ? JSON.parse(dados) : {};
}

async function atender(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${porta}`);
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
  if (req.headers.apikey !== chaveTeste) return json(res, 401, { code: 'bad_jwt' });

  const dados = await corpo(req);
  const conta = usuarios.get(dados.email);
  const token = req.headers.authorization?.replace(/^Bearer /i, '');
  const acesso = acessos.get(token);
  const acessoAtivo = acesso && acesso.exp > Date.now() / 1000;
  const rota = req.method + ' ' + url.pathname;
  const caminhoFator = url.pathname.match(/^\/auth\/v1\/factors\/([^/]+)(?:\/(challenge|verify))?$/);

  if (caminhoFator && acessoAtivo) {
    const [, id, operacao] = caminhoFator;
    const fatores = acesso.conta.user.factors;
    const fator = fatores.find(item => item.id === id);
    if (!fator) return json(res, 404, { code: 'mfa_factor_not_found' });

    if (req.method === 'DELETE' && !operacao && fator.status === 'unverified') {
      acesso.conta.user.factors = fatores.filter(item => item.id !== id);
      return json(res, 200, { id });
    }
    if (req.method === 'POST' && operacao === 'challenge') {
      const desafio = randomUUID();
      desafios.set(desafio, { id, token });
      return json(res, 200, { id: desafio, type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 60 });
    }
    if (req.method === 'POST' && operacao === 'verify') {
      const desafio = desafios.get(dados.challenge_id);
      desafios.delete(dados.challenge_id);
      if (desafio?.id !== id || desafio.token !== token || dados.code !== '123456') {
        return json(res, 400, { code: 'mfa_verification_failed', msg: 'Invalid authenticator code' });
      }
      fator.status = 'verified';
      return json(res, 200, sessao(acesso.conta, { aal: 'aal2' }));
    }
  }

  switch (rota) {
    case 'POST /auth/v1/token': {
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const titular = renovacoes.get(dados.refresh_token);
        if (!titular) return json(res, 400, { code: 'refresh_token_not_found', msg: 'Invalid refresh token' });
        renovacoes.delete(dados.refresh_token);
        return json(res, 200, sessao(titular.conta, { aal: titular.aal }));
      }
      if (!conta || conta.senha !== dados.password) {
        return json(res, 400, { code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      return json(res, 200, sessao(conta, { expirada: dados.email.startsWith('renovar-') }));
    }
    case 'POST /auth/v1/recover':
      if (!conta) return json(res, 404, { code: 'user_not_found', msg: 'User not found' });
      if (url.searchParams.get('redirect_to') !== 'http://127.0.0.1:3100/redefinir-senha') {
        return json(res, 400, { code: 'validation_failed', msg: 'Unexpected redirect' });
      }
      codigos.add(dados.email);
      return json(res, 200, {});
    case 'POST /auth/v1/verify':
      if (dados.type === 'recovery' && dados.token === codigoTeste && codigos.delete(dados.email)) {
        return json(res, 200, sessao(conta));
      }
      return json(res, 403, { code: 'otp_expired', msg: 'Invalid or expired code' });
    case 'GET /auth/v1/user':
      return acessoAtivo ? json(res, 200, acesso.conta.user) : json(res, 401, { code: 'bad_jwt', msg: 'Invalid access token' });
    case 'POST /auth/v1/factors': {
      if (!acessoAtivo) return json(res, 401, { code: 'bad_jwt' });
      const fator = novoFator('unverified');
      acesso.conta.user.factors.push(fator);
      return json(res, 200, {
        id: fator.id,
        type: 'totp',
        totp: { qr_code: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>', secret: 'CHAVEFICTICIATESTE' },
      });
    }
    case 'PUT /auth/v1/user':
      if (!acessoAtivo) return json(res, 401, { code: 'bad_jwt', msg: 'Invalid access token' });
      if (acesso.conta.user.factors.some(fator => fator.status === 'verified') && acesso.aal !== 'aal2') {
        return json(res, 401, { code: 'insufficient_aal' });
      }
      acesso.conta.senha = dados.password;
      return json(res, 200, acesso.conta.user);
    case 'POST /auth/v1/logout':
      if (!acessoAtivo) return json(res, 401, { code: 'bad_jwt', msg: 'Invalid access token' });
      if (url.searchParams.get('scope') === 'global') {
        for (const [refresh, titular] of renovacoes) {
          if (titular.conta === acesso.conta) renovacoes.delete(refresh);
        }
      } else {
        renovacoes.delete(acesso.refresh_token);
      }
      res.writeHead(204).end();
      return;
    default:
      return json(res, 404, { code: 'not_found' });
  }
}

createServer((req, res) => {
  atender(req, res).catch(() => json(res, 500, { code: 'fixture_error' }));
}).listen(porta, '127.0.0.1');
