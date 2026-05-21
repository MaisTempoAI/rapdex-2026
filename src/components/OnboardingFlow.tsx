import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ChevronRight, ChevronLeft, Smartphone, Monitor, RotateCw, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FileUploader } from '@/components/FileUploader';

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

type Step = 'boas_vindas' | 'dados' | 'faqs' | 'conexao' | 'finalizando' | 'sucesso';
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

  const [verificandoConexao, setVerificandoConexao] = useState(false);
  const [erroConexao, setErroConexao] = useState(false);
  const [conexaoVerificada, setConexaoVerificada] = useState(false);
  const [falhaIniciar, setFalhaIniciar] = useState(false);
  const [regenCooldown, setRegenCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Idempotência do cadastro: a mesma promise é retornada para todos os callers
  // (polling, botão manual, "pular conexão"), garantindo execução única.
  const cadastroPromiseRef = useRef<Promise<void> | null>(null);
  const cadastroAbortRef = useRef<AbortController | null>(null);

  // Credenciais retornadas pelo n8n para exibir na tela de sucesso
  const [credenciais, setCredenciais] = useState<{ login: string; senha: string; duplicate?: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Timeout de expiração do pairing code (300s) — precisa ser cancelável ao regenerar.
  const expiracaoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (expiracaoRef.current) {
      clearTimeout(expiracaoRef.current);
      expiracaoRef.current = null;
    }
    setPollingAtivo(false);
    setCountdown(null);
  }, []);

  // Limpa intervals e cancela request em voo quando o componente desmonta
  useEffect(() => () => {
    pararPolling();
    if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
    if (cadastroAbortRef.current) { cadastroAbortRef.current.abort(); cadastroAbortRef.current = null; }
  }, [pararPolling]);

  const iniciarCooldown = useCallback((segundos = 3) => {
    setRegenCooldown(segundos);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setRegenCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ─── Finalizar cadastro ───────────────────────────────────────
  // Promise lock: chamadas concorrentes (polling + clique manual + "pular")
  // recebem A MESMA promise — execução única garantida no frontend.
  // O header `Idempotency-Key` (= tempUploadId, único por sessão) garante
  // dedup também no servidor caso a request escape (cold start, retry, etc).
  const finalizarCadastro = useCallback((tok: string | null): Promise<void> => {
    if (cadastroPromiseRef.current) return cadastroPromiseRef.current;

    // Para polling/timeouts ANTES de qualquer await — evita novos ticks
    // disparando enquanto o cadastro está em curso.
    pararPolling();
    setLoading(true);
    setStep('finalizando');

    cadastroAbortRef.current = new AbortController();

    const payload = {
      celular,
      nome_empresa: nomeEmpresa,
      token: tok,
      dispositivo,
      temp_upload_id: tempUploadId.current,
      perguntas: faqsRef.current
        .filter(f => f.pergunta.trim() && f.resposta.trim())
        .map(f => ({
          slot: f.slot,
          pergunta: f.pergunta.trim(),
          resposta: f.resposta.trim(),
          midia_url: f.midia_url,
          midia_tipo: f.midia_tipo,
          ativa: true,
        })),
    };

    cadastroPromiseRef.current = (async () => {
      try {
        const res = await fetch('/api/cadastro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': tempUploadId.current,
          },
          body: JSON.stringify(payload),
          signal: cadastroAbortRef.current?.signal,
        });

        const data = await res.json();

        if (!data.ok) {
          toast.error(`Erro ao criar conta: ${data.error ?? 'Tente novamente.'}`);
          setStep('conexao');
          cadastroPromiseRef.current = null;   // libera retry
          return;
        }

        // Captura credenciais retornadas pelo n8n para exibir na tela de sucesso.
        // Fallback: usa o token local se o backend não retornou (compat com fluxo antigo).
        if (data.login || data.senha) {
          setCredenciais({
            login: data.login ?? celular,
            senha: data.senha ?? tok ?? '',
            duplicate: data.duplicate === true,
          });
        }

        toast.success(data.duplicate ? 'Você já tinha uma conta!' : 'Conta criada com sucesso!');
        setStep('sucesso');
        // promise mantida em ref após sucesso → bloqueia qualquer re-trigger acidental
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        toast.error('Falha de conexão. Verifique sua internet e tente novamente.');
        setStep('conexao');
        cadastroPromiseRef.current = null;     // libera retry
      } finally {
        setLoading(false);
      }
    })();

    return cadastroPromiseRef.current;
  }, [celular, nomeEmpresa, dispositivo, pararPolling]);

  // ─── Verificar conexão manual (botão "Já digitei o código") ─────
  const verificarConexaoManual = useCallback(async () => {
    setVerificandoConexao(true);
    setErroConexao(false);
    try {
      const res = await fetch(`/api/status-conexao?token=${encodeURIComponent(token ?? '')}`);
      const data = await res.json();
      if (data.conectado) {
        setConexaoVerificada(true);
        pararPolling();
        finalizarCadastro(token);
      } else {
        setErroConexao(true);
      }
    } catch {
      setErroConexao(true);
    } finally {
      setVerificandoConexao(false);
    }
  }, [token, pararPolling, finalizarCadastro]);

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

      <div className="flex flex-col gap-4">
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
            <div className="border-t border-slate-700 pt-3">
              <FileUploader
                value={faq.midia_url ?? ''}
                onChange={url => atualizarFaq(idx, 'midia_url', url || null)}
                userLogin={celular || 'onboarding'}
                questionNumber={faq.slot}
              />
            </div>
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
    setVerificandoConexao(false);
    setErroConexao(false);
    setConexaoVerificada(false);
    setFalhaIniciar(false);
    pararPolling();
    iniciarCooldown(3);

    try {
      let res: Response;
      if (dispositivo === 'desktop') {
        // QR Code: GET simples
        res = await fetch(`/api/qr-code?celular=${celular}`);
      } else {
        // Pairing Code: POST com body completo (nome_empresa, perguntas, etc.)
        const faqsValidas = faqsRef.current.filter(f => f.pergunta.trim() && f.resposta.trim());
        res = await fetch('/api/pairing-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            celular,
            nome_empresa: nomeEmpresa,
            token: null, // gerado pelo N8N
            dispositivo: 'celular',
            temp_upload_id: tempUploadId.current,
            perguntas: faqsValidas.map(f => ({
              slot: f.slot,
              pergunta: f.pergunta.trim(),
              resposta: f.resposta.trim(),
              midia_url: f.midia_url,
              midia_tipo: f.midia_tipo,
              ativa: true,
            })),
          }),
        });
      }
      const data = await res.json();

      if (!data.ok) {
        toast.error(data.error ?? 'Erro ao iniciar conexão. Tente novamente.');
        setFalhaIniciar(true);
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
        // Pairing code expira em 5 minutos — guarda em ref para cancelar ao regenerar
        if (expiracaoRef.current) clearTimeout(expiracaoRef.current);
        expiracaoRef.current = setTimeout(() => {
          if (pollingRef.current) {
            pararPolling();
            setPairingCode(null);
            setQrExpirado(true);
          }
          expiracaoRef.current = null;
        }, 300_000);
      }

      iniciarPolling(tok);
    } catch {
      toast.error('Falha na conexão com o servidor.');
      setFalhaIniciar(true);
    } finally {
      setLoading(false);
    }
  };

  const regerarCodigo = () => {
    if (regenCooldown > 0 || loading) return;
    const temCodigoAtivo = (qrBase64 || pairingCode) && !qrExpirado && !falhaIniciar;
    if (temCodigoAtivo) {
      const ok = window.confirm(
        'Gerar um novo código vai invalidar o atual. Se você já confirmou no WhatsApp, espere a verificação automática. Continuar mesmo assim?'
      );
      if (!ok) return;
    }
    iniciarConexao();
  };

  const iniciarPolling = (tok: string) => {
    setPollingAtivo(true);

    const doCheck = async () => {
      try {
        const res = await fetch(`/api/status-conexao?token=${encodeURIComponent(tok)}`);
        const data = await res.json();
        if (data.conectado) {
          setConexaoVerificada(true);
          pararPolling();
          finalizarCadastro(tok);
        }
      } catch { }
    };

    // Checa a cada 10s
    pollingRef.current = setInterval(doCheck, 10_000);
    // Check final 5s antes do QR expirar (55s)
    setTimeout(() => { if (pollingRef.current) doCheck(); }, 55_000);
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
          <p className="text-red-400 font-semibold text-sm">
            {dispositivo === 'desktop' ? 'QR Code expirado' : 'Código de pareamento expirado'}
          </p>
          <p className="text-slate-400 text-xs text-center">
            O código ficou inativo. Seus dados de cadastro foram mantidos — clique abaixo para gerar um novo.
          </p>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white font-semibold"
            onClick={regerarCodigo}
            disabled={loading || regenCooldown > 0}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
              : <><RotateCw className="w-4 h-4 mr-2" /> {regenCooldown > 0 ? `Aguarde ${regenCooldown}s` : 'Gerar novo código'}</>}
          </Button>
        </div>
      )}

      {falhaIniciar && !qrExpirado && (
        <div className="flex flex-col items-center gap-3 p-4 bg-slate-800 rounded-xl border border-red-500/40">
          <span className="text-3xl">⚠️</span>
          <p className="text-red-400 font-semibold text-sm">Não foi possível gerar o código</p>
          <p className="text-slate-400 text-xs text-center">
            Falha de comunicação com o servidor. Seus dados estão salvos — tente novamente.
          </p>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white font-semibold"
            onClick={regerarCodigo}
            disabled={loading || regenCooldown > 0}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Tentando...</>
              : <><RotateCw className="w-4 h-4 mr-2" /> {regenCooldown > 0 ? `Aguarde ${regenCooldown}s` : 'Tentar novamente'}</>}
          </Button>
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
          <button
            onClick={regerarCodigo}
            disabled={loading || regenCooldown > 0}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-green-400 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors mt-1"
          >
            <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {regenCooldown > 0 ? `Aguarde ${regenCooldown}s` : 'Gerar novo QR Code'}
          </button>
        </div>
      )}

      {pairingCode && (
        <div className="flex flex-col gap-4 bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
          {/* Código em destaque */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Seu código de pareamento</p>
            <div className="bg-slate-900 border border-slate-700 rounded-xl px-8 py-4 shadow-inner w-full flex justify-center">
              <p className="text-white text-3xl font-mono font-bold tracking-[0.25em] text-center">
                {pairingCode.length === 8
                  ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
                  : pairingCode}
              </p>
            </div>
          </div>

          {/* Instruções passo a passo */}
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-3 items-start bg-slate-900/50 rounded-lg p-3">
              <span className="text-green-400 font-bold text-base leading-tight shrink-0">1</span>
              <p className="text-slate-300 leading-snug">
                Aguarde a notificação no WhatsApp: <strong className="text-white">"Você está tentando conectar um dispositivo?"</strong> — toque em <strong className="text-green-400">Confirmar</strong>.
              </p>
            </div>
            <div className="flex gap-3 items-start bg-slate-900/50 rounded-lg p-3">
              <span className="text-green-400 font-bold text-base leading-tight shrink-0">2</span>
              <p className="text-slate-300 leading-snug">
                O WhatsApp pedirá o código de 8 dígitos. Digite o código acima.
              </p>
            </div>
            <div className="flex gap-3 items-start bg-slate-900/50 rounded-lg p-3">
              <span className="text-green-400 font-bold text-base leading-tight shrink-0">3</span>
              <p className="text-slate-300 leading-snug">
                Após digitar, clique no botão abaixo para confirmar a conexão.
              </p>
            </div>
          </div>

          {/* Botão de confirmação ou status */}
          {conexaoVerificada ? (
            <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 px-4 py-3 rounded-lg">
              <span className="text-lg">✅</span>
              <span className="font-semibold text-sm">WhatsApp conectado! Finalizando cadastro...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                onClick={verificarConexaoManual}
                disabled={verificandoConexao}
              >
                {verificandoConexao
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verificando conexão...</>
                  : 'Já digitei o código — Confirmar ✓'}
              </Button>
              {erroConexao && (
                <p className="text-red-400 text-xs text-center">
                  Ainda não detectamos a conexão. Confirme no WhatsApp e tente novamente.
                </p>
              )}
              <button
                onClick={regerarCodigo}
                disabled={loading || regenCooldown > 0}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-green-400 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors py-1"
              >
                <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {regenCooldown > 0 ? `Aguarde ${regenCooldown}s para gerar um novo` : 'Gerar um novo código'}
              </button>
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
        {!qrBase64 && !pairingCode && !qrExpirado && !falhaIniciar ? (
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
            className="flex-1 border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-300"
            onClick={regerarCodigo}
            disabled={loading || regenCooldown > 0}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
              : <><RotateCw className="w-4 h-4 mr-2" /> {regenCooldown > 0 ? `Aguarde ${regenCooldown}s` : 'Gerar novo código'}</>}
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

  // ─── Step: Sucesso ────────────────────────────────────────────
  const copiarCredenciais = async () => {
    if (!credenciais) return;
    try {
      await navigator.clipboard.writeText(
        `Login: ${credenciais.login}\nSenha: ${credenciais.senha}`,
      );
      setCopiado(true);
      toast.success('Credenciais copiadas!');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error('Não consegui copiar. Anote manualmente.');
    }
  };

  const renderSucesso = () => (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
        <span className="text-4xl">🎉</span>
      </div>
      <div className="w-full">
        <h2 className="text-2xl font-bold text-white mb-2">
          {credenciais?.duplicate ? 'Você já tinha conta!' : 'Tudo pronto!'}
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          {credenciais?.duplicate
            ? 'Encontramos um cadastro existente para esse número. Use as credenciais abaixo para entrar.'
            : 'O RAPDEX já está conectado e sua conta foi criada.'}
        </p>

        {credenciais && credenciais.senha ? (
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/40 rounded-xl p-4 flex flex-col gap-3 text-left shadow-inner mb-4">
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wide">Suas credenciais</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-baseline">
              <span className="text-slate-400 text-xs">📱 Login</span>
              <span className="text-white font-mono text-sm select-all">{credenciais.login}</span>
              <span className="text-slate-400 text-xs">🔑 Senha</span>
              <span className="text-white font-mono text-sm tracking-wider select-all">{credenciais.senha}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-green-500/40 text-green-400 hover:bg-green-500/10 hover:text-green-300 mt-1"
              onClick={copiarCredenciais}
            >
              {copiado
                ? <><Check className="w-4 h-4 mr-2" /> Copiado!</>
                : <><Copy className="w-4 h-4 mr-2" /> Copiar credenciais</>}
            </Button>
          </div>
        ) : null}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2 text-left shadow-inner">
          <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-1">
            {credenciais?.senha ? 'Backup no WhatsApp' : 'Como acessar'}
          </p>
          <p className="text-slate-300 text-sm">
            <span className="text-green-400 font-semibold mr-1">1.</span>
            Abra seu WhatsApp.
          </p>
          <p className="text-slate-300 text-sm">
            <span className="text-green-400 font-semibold mr-1">2.</span>
            Procure uma mensagem <strong className="text-white">de você para você mesmo(a)</strong>.
          </p>
          <p className="text-slate-300 text-sm">
            <span className="text-green-400 font-semibold mr-1">3.</span>
            Ela contém seu <strong>Login e Senha</strong>{credenciais?.senha ? ' (os mesmos acima)' : ''}.
          </p>
        </div>
      </div>
      <Button
        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-6 text-lg mt-2"
        onClick={() => onComplete(credenciais?.login || celular)}
      >
        Ir para o Login <ChevronRight className="ml-2 w-5 h-5" />
      </Button>
    </div>
  );

  // ─── Progress bar ─────────────────────────────────────────────
  const stepIndex: Record<Step, number> = {
    boas_vindas: 0, dados: 1, faqs: 2, conexao: 3, finalizando: 4, sucesso: 4,
  };
  const totalSteps = 4;
  const progresso = Math.min((stepIndex[step] / totalSteps) * 100, 100);

  const isWideStep = step === 'faqs';

  return (
    <div className="min-h-screen bg-slate-950 flex items-start justify-center p-4 py-8">
      <div className={`w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl transition-all duration-300 ${isWideStep ? 'max-w-2xl' : 'max-w-md'}`}>

        {onBack && step !== 'finalizando' && step !== 'sucesso' && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-5 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Login
          </button>
        )}

        {step !== 'boas_vindas' && step !== 'finalizando' && step !== 'sucesso' && (
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
        {step === 'sucesso' && renderSucesso()}
      </div>
    </div>
  );
}
