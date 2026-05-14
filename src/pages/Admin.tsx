﻿﻿import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Save, Unlock, Lock, RefreshCw, Plus, Trash2, XCircle, Search, Copy, Check } from 'lucide-react';

interface Slot {
  id: number;
  slot_nome: string;
  tipo: string;
  status: string;
  login: string | null;
  quepasa_key: string | null;
  quepasa_wid: string | null;
  quepasa_base_url: string;
  webhook_mensagem: string;
  workflow_url: string | null;
  n8n_hok_url: string | null;
  trial_expires_at: string | null;
  slot_notas: string | null;
  alocado_em: string | null;
  liberado_em: string | null;
}

const ADMIN_PWD = import.meta.env.VITE_ADMIN_PASSWORD as string;

const STATUS_COLOR: Record<string, string> = {
  disponivel: 'bg-green-500/20 text-green-400 border-green-500/30',
  ocupado:    'bg-red-500/20 text-red-400 border-red-500/30',
  manutencao: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const SLOT_VAZIO: Omit<Slot, 'id'> = {
  slot_nome: '', tipo: 'free', status: 'disponivel',
  login: null, quepasa_key: null, quepasa_wid: null,
  quepasa_base_url: 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
  webhook_mensagem: null, workflow_url: null, n8n_hok_url: null,
  trial_expires_at: null, slot_notas: null,
  alocado_em: null, liberado_em: null,
};

export default function Admin() {
  const [senha, setSenha]           = useState('');
  const [logado, setLogado]         = useState(false);
  const [slots, setSlots]           = useState<Slot[]>([]);
  const [loading, setLoading]       = useState(false);
  const [editando, setEditando]     = useState<Record<number, Partial<Slot>>>({});
  const [salvando, setSalvando]     = useState<number | null>(null);
  const [novoSlot, setNovoSlot]     = useState(false);
  const [novoForm, setNovoForm]     = useState<Omit<Slot,'id'>>(SLOT_VAZIO);
  const [buscaLogin, setBuscaLogin] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [copiando, setCopiando]     = useState<number | null>(null);
  const senhaRef = useRef('');

  const callApi = async (method: string, body?: any) => {
    const res = await fetch('/api/admin-slots', {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': senhaRef.current,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const login = () => {
    if (senha !== ADMIN_PWD) { toast.error('Senha incorreta.'); return; }
    setLogado(true);
    senhaRef.current = senha;
    carregar();
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await callApi('GET');
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const salvar = async (slot: Slot) => {
    const changes = editando[slot.id];
    if (!changes || !Object.keys(changes).length) return;
    setSalvando(slot.id);
    try {
      await callApi('PUT', { id: slot.id, ...changes });
      toast.success(`${slot.slot_nome} salvo.`);
      setEditando(p => { const n = {...p}; delete n[slot.id]; return n; });
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSalvando(null);
    }
  };

  const liberar = async (slot: Slot) => {
    if (!confirm(`Liberar slot ${slot.slot_nome}?`)) return;
    setSalvando(slot.id);
    try {
      await callApi('POST', { action: 'liberar', id: slot.id });
      toast.success('Slot liberado.');
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSalvando(null);
    }
  };

  const limparLogin = async (slot: Slot) => {
    if (!confirm(`Limpar login do slot ${slot.slot_nome}?`)) return;
    try {
      await callApi('PUT', { id: slot.id, login: null });
      toast.success(`Login de ${slot.slot_nome} removido.`);
      setEditando(p => { const n = {...p}; delete n[slot.id]; return n; });
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const excluir = async (slot: Slot) => {
    if (!confirm(`Excluir slot ${slot.slot_nome}? Isso é irreversível.`)) return;
    try {
      await callApi('DELETE', { id: slot.id });
      toast.success('Slot excluído.');
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const criarSlot = async () => {
    if (!novoForm.slot_nome) {
      toast.error('Nome e webhook são obrigatórios.'); return;
    }
    try {
      await callApi('POST', { action: 'criar', slot: novoForm });
      toast.success('Slot criado!');
      setNovoSlot(false);
      setNovoForm(SLOT_VAZIO);
      carregar();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const set = (id: number, field: keyof Slot, val: string) =>
    setEditando(p => ({ ...p, [id]: { ...p[id], [field]: val } }));

  const val = (slot: Slot, field: keyof Slot) =>
    (editando[slot.id]?.[field] as string) ?? (slot[field] as string) ?? '';

  const copiar = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiando(id);
    setTimeout(() => setCopiando(null), 2000);
    toast.success('Copiado!');
  };

  const slotsFiltrados = slots.filter(s => {
    const matchLogin = !buscaLogin || s.login?.toLowerCase().includes(buscaLogin.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || s.status === filtroStatus;
    return matchLogin && matchStatus;
  });

  // ── Login ────────────────────────────────────────────────────
  if (!logado) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-white font-bold">Admin RAPDEX</h1>
            <p className="text-slate-500 text-xs">Gestão de Slots</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input type="password" placeholder="Senha admin"
            value={senha} onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={login}>
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Painel ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header & Filtros */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-2xl font-bold">Slots RAPDEX</h1>
              <p className="text-slate-500 text-sm">{slotsFiltrados.length} slots encontrados</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-700 text-slate-400" onClick={carregar} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setNovoSlot(true)}>
                <Plus className="w-4 h-4 mr-2" /> Novo slot
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar por login/celular..."
                value={buscaLogin}
                onChange={e => setBuscaLogin(e.target.value)}
                className="bg-slate-800 border-slate-700 pl-10 text-white"
              />
            </div>
            <div className="w-[150px]">
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2"
              >
                <option value="todos">Todos Status</option>
                <option value="disponivel">Disponível</option>
                <option value="ocupado">Ocupado</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['disponivel','ocupado','manutencao'] as const).map(s => (
            <div key={s} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">{s}</p>
              <p className="text-white text-2xl font-bold">
                {Array.isArray(slots) ? slots.filter(sl => sl.status === s).length : 0}
              </p>
            </div>
          ))}
        </div>

        {/* Formulário novo slot */}
        {novoSlot && (
          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 mb-4">
            <h3 className="text-purple-400 font-semibold mb-4">Novo Slot</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                ['slot_nome','Nome (ex: free_02)'],
                ['n8n_hok_url','N8N Webhook URL'],
                ['workflow_url','Workflow URL'],
                ['trial_expires_at','Trial Expira em (AAAA-MM-DD HH:MM:SS)'],
              ].map(([f, label]) => (
                <div key={f}>
                  <label className="text-slate-500 text-xs mb-1 block">{label}</label>
                  <Input value={(novoForm as any)[f] ?? ''}
                    onChange={e => setNovoForm(p => ({...p, [f]: e.target.value}))}
                    className="bg-slate-800 border-slate-700 text-white text-sm font-mono"
                  />
                </div>
              ))}
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Tipo</label>
                <select value={novoForm.tipo}
                  onChange={e => setNovoForm(p => ({...p, tipo: e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2">
                  <option value="free">free</option>
                  <option value="premium">premium</option>
                </select>
              </div>

            </div>
            <div className="flex gap-2">
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={criarSlot}>
                <Save className="w-4 h-4 mr-1" /> Criar
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-400"
                onClick={() => { setNovoSlot(false); setNovoForm(SLOT_VAZIO); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de slots */}
        {loading && slots.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}

        <div className="flex flex-col gap-4">
          {slotsFiltrados.map(slot => {
            const temAlteracao = Object.keys(editando[slot.id] ?? {}).length > 0;
            const isOcupado = slot.status === 'ocupado';
            
            return (
              <div key={slot.id} className={`rounded-xl p-5 border transition-all duration-300 ${
                isOcupado 
                  ? 'bg-red-500/5 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.05)]' 
                  : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-white font-mono font-bold">{slot.slot_nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[slot.status] ?? ''}`}>
                    {slot.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{slot.tipo}</span>
                  {slot.login && (
                    <span className="text-slate-400 text-xs ml-auto">
                      👤 {slot.login}
                      {slot.alocado_em && <span className="text-slate-600 ml-1">desde {new Date(slot.alocado_em).toLocaleDateString('pt-BR')}</span>}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">ID do Slot</label>
                    <Input value={slot.id} disabled className="bg-slate-950 border-slate-800 text-slate-500 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Login (Celular)</label>
                    <Input value={val(slot, 'login')}
                      onChange={e => set(slot.id, 'login', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Trial Expira em</label>
                    <Input value={val(slot, 'trial_expires_at')}
                      onChange={e => set(slot.id, 'trial_expires_at', e.target.value)}
                      placeholder="AAAA-MM-DD HH:MM:SS"
                      className="bg-slate-800 border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                  {slot.quepasa_key ? (
                    <div>
                      <label className="text-slate-500 text-xs mb-1 block">🔑 Chave de Acesso</label>
                      <div className="flex gap-2">
                        <Input value={slot.quepasa_key} readOnly
                          className="bg-slate-950 border-slate-800 text-slate-300 text-sm font-mono flex-1"
                        />
                        <Button size="icon" variant="outline" className="border-slate-700 text-slate-400"
                          onClick={() => copiar(slot.id, slot.quepasa_key!)}>
                          {copiando === slot.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : <div />}
                  <div className="md:col-span-2">
                    <label className="text-slate-500 text-xs mb-1 block">N8N Webhook URL</label>
                    <div className="flex gap-2">
                      <Input value={val(slot, 'n8n_hok_url')}
                        onChange={e => set(slot.id, 'n8n_hok_url', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white text-sm font-mono flex-1"
                      />
                      {slot.n8n_hok_url && (
                        <Button size="icon" variant="outline" className="border-slate-700 text-slate-400"
                          onClick={() => copiar(slot.id, slot.n8n_hok_url!)}>
                          {copiando === slot.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-slate-500 text-xs mb-1 block">Workflow URL (para abrir no N8N)</label>
                    <div className="flex gap-2">
                      <Input value={val(slot, 'workflow_url')}
                        onChange={e => set(slot.id, 'workflow_url', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white text-sm font-mono flex-1"
                      />
                      {slot.workflow_url && (
                        <Button size="icon" variant="outline" className="border-slate-700 text-slate-400"
                          onClick={() => copiar(slot.id, slot.workflow_url!)}>
                          {copiando === slot.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Status</label>
                    <select value={editando[slot.id]?.status ?? slot.status}
                      onChange={e => set(slot.id, 'status', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2">
                      <option value="disponivel">disponivel</option>
                      <option value="ocupado">ocupado</option>
                      <option value="manutencao">manutencao</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Tipo</label>
                    <select value={editando[slot.id]?.tipo ?? slot.tipo}
                      onChange={e => set(slot.id, 'tipo', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2">
                      <option value="free">free</option>
                      <option value="premium">premium</option>
                    </select>
                  </div>
                </div>

                {slot.quepasa_wid && (
                  <div className="mt-3 flex gap-4 text-xs text-slate-600">
                    <span>📱 {slot.quepasa_wid}</span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {temAlteracao && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => salvar(slot)} disabled={salvando === slot.id}>
                      {salvando === slot.id ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Save className="w-3 h-3 mr-1"/>}
                      Salvar
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    className="border-green-500/40 text-green-400 hover:bg-green-500/10"
                    onClick={() => liberar(slot)} disabled={salvando === slot.id}>
                    <Unlock className="w-3 h-3 mr-1"/> LIBERAR
                  </Button>
                  {slot.login && (
                    <Button size="sm" variant="outline"
                      className="border-slate-500/40 text-slate-400 hover:bg-slate-500/10"
                      onClick={() => limparLogin(slot)} disabled={salvando === slot.id}>
                      <XCircle className="w-3 h-3 mr-1"/> Limpar login
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 ml-auto"
                    onClick={() => excluir(slot)}>
                    <Trash2 className="w-3 h-3 mr-1"/> Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
