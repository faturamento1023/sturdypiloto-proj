import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCadastroMedico } from './validar-cadastro-medico.mjs';
const valido = () => ({ nome: 'Maria Silva', ufConselho: 'GO', numeroConselho: '001234', especialidade: 'Clínica médica', titulo: '', ativo: true });
test('preserva zeros à esquerda do CRM e normaliza UF', () => {
 const r = validarCadastroMedico({...valido(), ufConselho:'go'}); assert.equal(r.ok,true); assert.equal(r.valor.numeroConselho,'001234'); assert.equal(r.valor.ufConselho,'GO');
});
test('rejeita corpo e campos ausentes', () => {
 for (const x of [null, [], {}, 'x']) assert.equal(validarCadastroMedico(x).ok,false);
});
test('rejeita UF, CRM e estado inválidos', () => {
 for (const x of [{ufConselho:'XX'}, {numeroConselho:'abc'}, {numeroConselho:'-1'}, {ativo:'true'}]) assert.equal(validarCadastroMedico({...valido(),...x}).ok,false);
});
test('bloqueia segredo, certificado, assinatura e escopo controlado pelo cliente', () => {
 for (const key of ['certificado','pfx','senha','assinatura','privateKey','usuarioId','unidadeId']) assert.equal(validarCadastroMedico({...valido(),[key]:'qualquer'}).ok,false);
});
test('não modifica entrada e não transforma dados excessivos em válidos', () => {
 const x = {...valido(), nome:'A'.repeat(161)}; assert.equal(validarCadastroMedico(x).ok,false); assert.equal(x.nome.length,161);
});
