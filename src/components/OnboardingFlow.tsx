import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ChevronRight, ChevronLeft, Smartphone, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ───────────────────────────────────────────────────
interface FaqSlot {
  slot: number;
  pergunta: string;
  resposta: string;
  midia_url: string | null;
  midia_tipo: 'imagem' | 'audio' | 'pdf' | null;
  ativa: boolean;
}

interface OnboardingProps {
  onComplete: (login: string) => void;
  onBack?: () => void;
}

type Step = 'boas_vindas' | 'dados' | 'faqs' | 'conexao' | 'finalizando';
type Dispositivo = 'desktop' | 'celular';

// ─── Componente Principal ─────────────────────────────────────
export default function OnboardingFlow({ onComplete, onBack }: OnboardingProps) {
  const [step, setStep] = useState<Step>('boas_vindas');
  const [dispositivo, setDispositivo] = useState<Dispositivo>('desktop');
  const [loading, setLoading] = useState(false);

  const [celular, setCelular] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');

  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pollingAtivo, setPollingAtivo] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [qrExpirado, setQrExpirado] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [faqs, setFaqs] = useState<FaqSlot[]>([
    { slot: 1, pergunta: '', resposta: '', midia_url: null, midia_tipo: null, ativa: true },
  ]);

  const tempUploadId = useRef(`onb_${crypto.randomUUID()}`);
  const faqsRef = useRef(faqs);
  faqsRef.current = faqs;

  // ─── Helpers ─────────────────────────────────────────────────
  const formatarCelular = (v: string) => v.replace(/\D/g, '').slice(0, 11);

  const pararPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setPollingAtivo(false);
    setCountdown(null);
  }, []);

  // ─── Finalizar cadastro ───────────────────────────────────────
  const finalizarCadastro = useCallback(async (tok: string | null) => {
    const faqsValidas = faqsRef.current.filter(f => f.pergunta.trim() && f.resposta.trim());
    setLoading(true);
    setStep('finalizando');

    const payload = {
      celular,
      nome_empresa: nomeEmpresa,
      token: tok,
      dispositivo,
      temp_upload_id: tempUploadId.current,
      perguntas: faqsValidas.map(f => ({
        slot: f.slot,
        pergunta: f.pergunta.trim(),
        resposta: f.resposta.trim(),
        midia_url: f.midia_url,
        midia_tipo: f.midia_tipo,
        ativa: true,
      })),
    };

    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(`Erro ao criar conta: ${data.error ?? 'Tente novamente.'}`);
        setStep('conexao');
        return;
      }

      toast.success('Conta criada! Você receberá sua senha pelo WhatsApp.');
      onComplete(celular);
    } catch {
      toast.error('Falha de conexão. Verifique sua internet e tente novamente.');
      setStep('conexao');
    } finally {
      setLoading(false);
    }
  }, [celular, nomeEmpresa, dispositivo, onComplete]);

  // ─── Step: Boas-vindas ────────────────────────────────────────
  const renderBoasVindas = () => (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
        <span className="text-3xl">🤖</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo ao RAPDEX</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Configure seu atendimento automático via WhatsApp em menos de 5 minutos.
          <br />Teste grátis por <span className="text-green-400 font-semibold">7 dias</span>.
        </p>
      </div>
      <Button
        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
        onClick={() => setStep('dados')}
      >
        Começar agora <ChevronRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );

  // ─── Step: Dados da empresa ───────────────────────────────────
  const [loginJaExiste, setLoginJaExiste] = useState(false);

  const avancarParaFaqs = async () => {
    setLoginJaExiste(false);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_login_exists', { p_login: celular });
      if (!error && data === true) {
        setLoginJaExiste(true);
        return;
      }
    } catch {
      // em caso de falha, deixa prosseguir
    } finally {
      setLoading(false);
    }
    setStep('faqs');
  };

  const renderDados = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Seus dados</h2>
        <p className="text-slate-400 text-sm">Seu número de WhatsApp será o login do sistema.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-slate-300 text-sm mb-1 block">Nome da empresa</label>
          <Input
            placeholder="Ex: Pizzaria do João"
            value={nomeEmpresa}
            onChange={e => setNomeEmpresa(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <label className="text-slate-300 text-sm mb-1 block">Celular (WhatsApp)</label>
          <Input
            placeholder="11999999999"
            value={celular}
            onChange={e => setCelular(formatarCelular(e.target.value))}
            inputMode="numeric"
            maxLength={11}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <p className="text-slate-500 text-xs mt-1">Só números, com DDD. Ex: 11999999999</p>
        </div>
      </div>

      {loginJaExiste && (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-3 text-sm text-yellow-300 flex flex-col gap-1">
          <span className="font-semibold">Esse número já tem uma conta.</span>
          <span className="text-yellow-400/80 text-xs">
            Faça login com seu número e senha.{' '}
            {onBack && (
              <button className="underline hover:text-yellow-200 transition-colors" onClick={onBack}>
                Ir para o login →
              </button>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-slate-700 text-slate-400" onClick={() => setStep('boas_vindas')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button
          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          disabled={celular.length < 10 || !nomeEmpresa.trim() || loading}
          onClick={avancarParaFaqs}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Continuar <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ─── Step: FAQs ───────────────────────────────────────────────
  const adicionarFaq = () => {
    if (faqs.length >= 5) {
      toast.info('Configure até 5 perguntas no cadastro. Adicione mais no painel.');
      return;
    }
    setFaqs(prev => [
      ...prev,
      { slot: prev.length + 1, pergunta: '', resposta: '', midia_url: null, midia_tipo: null, ativa: true },
    ]);
  };

  const removerFaq = (idx: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, slot: i + 1 })));
  };

  const atualizarFaq = (idx: number, campo: keyof FaqSlot, valor: string | boolean | null) => {
    setFaqs(prev => prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));
  };

  const avancarParaConexao = () => {
    const validas = faqs.filter(f => f.pergunta.trim() && f.resposta.trim());
    if (validas.length === 0) {
      toast.error('Configure pelo menos uma pergunta e resposta antes de continuar.');
      return;
    }
    setStep('conexao');
  };

  const renderFaqs = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Perguntas frequentes</h2>
        <p className="text-slate-400 text-sm">
          Configure as respostas automáticas do bot. Você pode adicionar mais depois no painel.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-sm font-semibold">Pergunta {faq.slot}</span>
              {faqs.length > 1 && (
                <button onClick={() => removerFaq(idx)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <Input
              placeholder="Ex: Qual o horário de funcionamento?"
              value={faq.pergunta}
              onChange={e => atualizarFaq(idx, 'pergunta', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-sm"
            />
            <Textarea
              placeholder="Ex: Funcionamos de seg a sex, 9h às 18h."
              value={faq.resposta}
              onChange={e => atualizarFaq(idx, 'resposta', e.target.value)}
              rows={2}
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-sm resize-none"
            />
          </div>
        ))}
      </div>

      <button
        onClick={adicionarFaq}
        className="flex items-center justify-center gap-2 text-green-400 text-sm border border-dashed border-green-500/40 rounded-xl py-3 hover:bg-green-500/5 transition-all"
      >
        <Plus className="w-4 h-4" /> Adicionar pergunta
      </button>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-slate-700 text-slate-400"
          onClick={() => setStep('dados')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
          onClick={avancarParaConexao}
        >
          Continuar <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ─── Step: Conexão WhatsApp ───────────────────────────────────
  const iniciarConexao = async () => {
    setLoading(true);
    setQrBase64(null);
    setPairingCode(null);
    setQrExpirado(false);
    pararPolling();

    try {
      const endpoint = dispositivo === 'desktop' ? '/api/qr-code' : '/api/pairing-code';
      const res = await fetch(`${endpoint}?celular=${celular}`);
      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error ?? 'Erro ao iniciar conexão. Tente novamente.');
        return;
      }

      const tok = data.token ?? null;
      setToken(tok);

      if (dispositivo === 'desktop') {
        setQrBase64(data.qr_base64);
        let secs = 60;
        setCountdown(secs);
        countdownRef.current = setInterval(() => {
          secs -= 1;
          if (secs <= 0) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
            setPollingAtivo(false);
            setCountdown(null);
            setQrBase64(null);
            setQrExpirado(true);
          } else {
            setCountdown(secs);
          }
        }, 1000);
      } else {
        setPairingCode(data.code);
      }

      iniciarPolling(tok);
    } catch {
      toast.error('Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarPolling = (tok: string) => {
    setPollingAtivo(true);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status-conexao?token=${tok}`);
        const data = await res.json();
        if (data.conectado) {
          pararPolling();
          finalizarCadastro(tok);
        }
      } catch {
        // silencia erros de polling
      }
    }, 3000);
  };

  const renderConexao = () => (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Conectar WhatsApp</h2>
        <p className="text-slate-400 text-sm">Escolha como conectar seu WhatsApp ao RAPDEX.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setDispositivo('desktop')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            dispositivo === 'desktop'
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
          }`}
        >
          <Monitor className="w-6 h-6" />
          <span className="text-sm font-medium">QR Code</span>
          <span className="text-xs opacity-70">WhatsApp no PC</span>
        </button>
        <button
          onClick={() => setDispositivo('celular')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
            dispositivo === 'celular'
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
          }`}
        >
          <Smartphone className="w-6 h-6" />
          <span className="text-sm font-medium">Código</span>
          <span className="text-xs opacity-70">WhatsApp no celular</span>
        </button>
      </div>

      {qrExpirado && (
        <div className="flex flex-col items-center gap-3 p-4 bg-slate-800 rounded-xl border border-red-500/40">
          <span className="text-3xl">⏱️</span>
          <p className="text-red-400 font-semibold text-sm">QR Code expirado</p>
          <p className="text-slate-400 text-xs text-center">
            O código ficou inativo por 1 minuto. Clique em "Gerar novo" para continuar.
          </p>
        </div>
      )}

      {qrBase64 && !qrExpirado && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <img src={qrBase64} alt="QR Code WhatsApp" className="w-48 h-48 rounded-xl border border-slate-700" />
            {countdown !== null && (
              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-mono border ${countdown <= 10 ? 'bg-red-900/80 border-red-500 text-red-300' : 'bg-slate-900 border-slate-600 text-slate-400'}`}>
                ⏱ {countdown}s
              </div>
            )}
          </div>
          <p className="text-slate-400 text-xs text-center mt-2">
            Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo
          </p>
          {pollingAtivo && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Aguardando conexão...
            </div>
          )}
        </div>
      )}

      {pairingCode && (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-4">
            <p className="text-slate-400 text-xs mb-1 text-center">Código de pareamento</p>
            <p className="text-white text-3xl font-mono font-bold tracking-widest text-center">{pairingCode}</p>
          </div>
          <p className="text-slate-400 text-xs text-center">
            No WhatsApp: Configurações → Dispositivos vinculados → Vincular com número de telefone
          </p>
          {pollingAtivo && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Aguardando confirmação...
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-slate-700 text-slate-400"
          onClick={() => { pararPolling(); setStep('faqs'); }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {!qrBase64 && !pairingCode ? (
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            onClick={iniciarConexao}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Conectar
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1 border-slate-700 text-slate-400"
            onClick={iniciarConexao}
            disabled={loading}
          >
            Gerar novo
          </Button>
        )}
      </div>

      <button
        className="text-slate-600 text-xs text-center hover:text-slate-400 transition-colors mt-1"
        onClick={() => { pararPolling(); finalizarCadastro(token); }}
      >
        Pular conexão por agora →
      </button>
    </div>
  );

  // ─── Step: Finalizando ────────────────────────────────────────
  const renderFinalizando = () => (
    <div className="flex flex-col items-center gap-6 text-center">
      <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Criando sua conta...</h2>
        <p className="text-slate-400 text-sm">Isso leva alguns segundos.</p>
      </div>
    </div>
  );

  // ─── Progress bar ─────────────────────────────────────────────
  const stepIndex: Record<Step, number> = {
    boas_vindas: 0, dados: 1, faqs: 2, conexao: 3, finalizando: 4,
  };
  const totalSteps = 4;
  const progresso = Math.min((stepIndex[step] / totalSteps) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">

        {onBack && step !== 'finalizando' && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-5 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Login
          </button>
        )}

        {step !== 'boas_vindas' && step !== 'finalizando' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-xs">Passo {stepIndex[step]} de {totalSteps}</span>
              <span className="text-green-400 text-xs">{Math.round(progresso)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}

        {step === 'boas_vindas' && renderBoasVindas()}
        {step === 'dados' && renderDados()}
        {step === 'faqs' && renderFaqs()}
        {step === 'conexao' && renderConexao()}
        {step === 'finalizando' && renderFinalizando()}
      </div>
    </div>
  );
}
