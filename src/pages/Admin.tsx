import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Save, Unlock, Lock, RefreshCw } from 'lucide-react';

interface Slot {
  id: number;
  slot_nome: string;
  tipo: 'free' | 'premium';
  status: 'disponivel' | 'ocupado' | 'manutencao';
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

const STATUS_COLOR: Record<string, string> = {
  disponivel:  'bg-green-500/20 text-green-400 border-green-500/30',
  ocupado:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  manutencao:  'bg-red-500/20 text-red-400 border-red-500/30',
};

const TIPO_COLOR: Record<string, string> = {
  free:    'bg-slate-700 text-slate-300',
  premium: 'bg-purple-500/20 text-purple-400',
};

export default function Admin() {
  const [adminKey, setAdminKey]     = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [slots, setSlots]           = useState<Slot[]>([]);
  const [editando, setEditando]     = useState<Record<number, Partial<Slot>>>({});
  const [loading, setLoading]       = useState(false);
  const [salvando, setSalvando]     = useState<number | null>(null);

  const buscarSlots = async (key = adminKey) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-slots', {
        headers: { 'x-admin-key': key },
      });
      if (res.status === 401) { toast.error('Senha incorreta.'); return; }
      const data = await res.json();
      setSlots(data);
      setAutenticado(true);
    } catch {
      toast.error('Erro ao buscar slots.');
    } finally {
      setLoading(false);
    }
  };

  const salvar = async (slot: Slot) => {
    const changes = editando[slot.id];
    if (!changes || Object.keys(changes).length === 0) return;
    setSalvando(slot.id);
    try {
      const res = await fetch('/api/admin-slots', {
        method: 'PUT',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id, ...changes }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Slot ${slot.slot_nome} atualizado.`);
        setEditando(prev => { const n = { ...prev }; delete n[slot.id]; return n; });
        buscarSlots();
      }
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSalvando(null);
    }
  };

  const liberarSlot = async (slot: Slot) => {
    if (!confirm(`Liberar slot ${slot.slot_nome} (desconecta ${slot.login})?`)) return;
    setSalvando(slot.id);
    try {
      const res = await fetch('/api/admin-slots', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'liberar', id: slot.id }),
      });
      const data = await res.json();
      if (data.ok) { toast.success('Slot liberado.'); buscarSlots(); }
    } catch {
      toast.error('Erro ao liberar slot.');
    } finally {
      setSalvando(null);
    }
  };

  const setField = (id: number, field: keyof Slot, value: string) => {
    setEditando(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const getVal = (slot: Slot, field: keyof Slot): string =>
    (editando[slot.id]?.[field] as string) ?? (slot[field] as string) ?? '';

  if (!autenticado) {
    return (
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
            <Input
              type="password"
              placeholder="Senha admin"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarSlots()}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => buscarSlots()}
              disabled={loading || !adminKey}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Slots RAPDEX</h1>
            <p className="text-slate-500 text-sm">{slots.length} slots cadastrados</p>
          </div>
          <Button variant="outline" className="border-slate-700 text-slate-400" onClick={() => buscarSlots()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['disponivel', 'ocupado', 'manutencao'] as const).map(s => (
            <div key={s} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs capitalize mb-1">{s}</p>
              <p className="text-white text-2xl font-bold">{slots.filter(sl => sl.status === s).length}</p>
            </div>
          ))}
        </div>

        {/* Tabela de slots */}
        <div className="flex flex-col gap-4">
          {slots.map(slot => {
            const temAlteracao = Object.keys(editando[slot.id] ?? {}).length > 0;
            return (
              <div key={slot.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                {/* Cabeçalho do slot */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-white font-mono font-bold text-lg">{slot.slot_nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[slot.status]}`}>
                    {slot.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[slot.tipo]}`}>
                    {slot.tipo}
                  </span>
                  {slot.login && (
                    <span className="text-slate-400 text-xs ml-auto">
                      👤 {slot.login}
                      {slot.alocado_em && (
                        <span className="text-slate-600 ml-1">
                          desde {new Date(slot.alocado_em).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Campos editáveis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Webhook Mensagem (N8N)</label>
                    <Input
                      value={getVal(slot, 'webhook_mensagem')}
                      onChange={e => setField(slot.id, 'webhook_mensagem', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Workflow URL (N8N)</label>
                    <Input
                      value={getVal(slot, 'workflow_url')}
                      onChange={e => setField(slot.id, 'workflow_url', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Status</label>
                    <select
                      value={getVal(slot, 'status') || slot.status}
                      onChange={e => setField(slot.id, 'status', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2"
                    >
                      <option value="disponivel">disponivel</option>
                      <option value="ocupado">ocupado</option>
                      <option value="manutencao">manutencao</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Notas</label>
                    <Input
                      value={getVal(slot, 'slot_notas')}
                      onChange={e => setField(slot.id, 'slot_notas', e.target.value)}
                      placeholder="Observações internas..."
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                </div>

                {/* QUEPASA info (read-only) */}
                {slot.quepasa_key && (
                  <div className="mt-3 flex gap-4 text-xs text-slate-600">
                    <span>🔑 {slot.quepasa_key}</span>
                    {slot.quepasa_wid && <span>📱 {slot.quepasa_wid}</span>}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 mt-4">
                  {temAlteracao && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => salvar(slot)}
                      disabled={salvando === slot.id}
                    >
                      {salvando === slot.id
                        ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        : <Save className="w-3 h-3 mr-1" />}
                      Salvar
                    </Button>
                  )}
                  {slot.status === 'ocupado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                      onClick={() => liberarSlot(slot)}
                      disabled={salvando === slot.id}
                    >
                      <Unlock className="w-3 h-3 mr-1" /> Liberar slot
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
