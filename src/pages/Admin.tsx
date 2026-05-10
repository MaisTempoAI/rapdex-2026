import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Save, Unlock, Lock, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  slot_notas: string | null;
  alocado_em: string | null;
  liberado_em: string | null;
}

const ADMIN_PWD = import.meta.env.VITE_ADMIN_PASSWORD as string;

const STATUS_COLOR: Record<string, string> = {
  disponivel: 'bg-green-500/20 text-green-400 border-green-500/30',
  ocupado:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  manutencao: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const SLOT_VAZIO: Omit<Slot, 'id'> = {
  slot_nome: '', tipo: 'free', status: 'disponivel',
  login: null, quepasa_key: null, quepasa_wid: null,
  quepasa_base_url: 'https://quepasa-stack-quepasa.pkgaq6.easypanel.host',
  webhook_mensagem: '', workflow_url: '', slot_notas: '',
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

  const login = () => {
    if (senha !== ADMIN_PWD) { toast.error('Senha incorreta.'); return; }
    setLogado(true);
    carregar();
  };

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rapdex_slots')
      .select('*')
      .order('tipo').order('slot_nome');
    setLoading(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setSlots(data ?? []);
  };

  const salvar = async (slot: Slot) => {
    const changes = editando[slot.id];
    if (!changes || !Object.keys(changes).length) return;
    setSalvando(slot.id);
    const { error } = await supabase.from('rapdex_slots').update(changes).eq('id', slot.id);
    setSalvando(null);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success(`${slot.slot_nome} salvo.`);
    setEditando(p => { const n = {...p}; delete n[slot.id]; return n; });
    carregar();
  };

  const liberar = async (slot: Slot) => {
    if (!confirm(`Liberar slot ${slot.slot_nome}?`)) return;
    setSalvando(slot.id);
    const { error } = await supabase.from('rapdex_slots').update({
      status: 'disponivel', login: null, quepasa_key: null,
      quepasa_wid: null, liberado_em: new Date().toISOString(),
    }).eq('id', slot.id);
    setSalvando(null);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Slot liberado.');
    carregar();
  };

  const excluir = async (slot: Slot) => {
    if (!confirm(`Excluir slot ${slot.slot_nome}? Isso é irreversível.`)) return;
    const { error } = await supabase.from('rapdex_slots').delete().eq('id', slot.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Slot excluído.');
    carregar();
  };

  const criarSlot = async () => {
    if (!novoForm.slot_nome || !novoForm.webhook_mensagem) {
      toast.error('Nome e webhook são obrigatórios.'); return;
    }
    const { error } = await supabase.from('rapdex_slots').insert(novoForm);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Slot criado!');
    setNovoSlot(false);
    setNovoForm(SLOT_VAZIO);
    carregar();
  };

  const set = (id: number, field: keyof Slot, val: string) =>
    setEditando(p => ({ ...p, [id]: { ...p[id], [field]: val } }));

  const val = (slot: Slot, field: keyof Slot) =>
    (editando[slot.id]?.[field] as string) ?? (slot[field] as string) ?? '';

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

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Slots RAPDEX</h1>
            <p className="text-slate-500 text-sm">{slots.length} slots</p>
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

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['disponivel','ocupado','manutencao'] as const).map(s => (
            <div key={s} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-1">{s}</p>
              <p className="text-white text-2xl font-bold">{slots.filter(sl => sl.status === s).length}</p>
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
                ['webhook_mensagem','Webhook Mensagem (N8N)'],
                ['workflow_url','Workflow URL'],
                ['quepasa_base_url','QUEPASA Base URL'],
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
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Notas</label>
                <Input value={novoForm.slot_notas ?? ''}
                  onChange={e => setNovoForm(p => ({...p, slot_notas: e.target.value}))}
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                />
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
          {slots.map(slot => {
            const temAlteracao = Object.keys(editando[slot.id] ?? {}).length > 0;
            return (
              <div key={slot.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
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
                  {([
                    ['webhook_mensagem','Webhook Mensagem (N8N)'],
                    ['workflow_url','Workflow URL'],
                    ['quepasa_base_url','QUEPASA Base URL'],
                    ['slot_notas','Notas'],
                  ] as [keyof Slot, string][]).map(([f, label]) => (
                    <div key={f as string}>
                      <label className="text-slate-500 text-xs mb-1 block">{label}</label>
                      <Input value={val(slot, f)}
                        onChange={e => set(slot.id, f, e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white text-sm font-mono"
                      />
                    </div>
                  ))}
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
                </div>

                {slot.quepasa_key && (
                  <div className="mt-3 flex gap-4 text-xs text-slate-600">
                    <span>🔑 {slot.quepasa_key}</span>
                    {slot.quepasa_wid && <span>📱 {slot.quepasa_wid}</span>}
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
                  {slot.status === 'ocupado' && (
                    <Button size="sm" variant="outline"
                      className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                      onClick={() => liberar(slot)} disabled={salvando === slot.id}>
                      <Unlock className="w-3 h-3 mr-1"/> Liberar
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
