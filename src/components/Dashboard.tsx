import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MaterialInput } from "@/components/MaterialInput";
import { MaterialTextarea } from "@/components/MaterialTextarea";

import { FileUploader } from "@/components/FileUploader";
import { LeadsHistory } from "@/components/LeadsHistory";
import { ChangePasswordScreen } from "@/components/ChangePasswordScreen";
import { AwayMode } from "@/components/AwayMode";
import {
  Bot,
  Settings,
  MessageSquare,
  LogOut,
  ExternalLink,
  Users,
  BarChart3,
  ArrowLeft,
  Key,
  HelpCircle,
  Clock,
  Bell,
  Image,
  Music,
  FileText,
  X,
  Loader2,
  Crown,
  Star,
  Search,
  History,
  Eye,
  Sparkles,
  Download,
  RefreshCw,
  WifiOff,
  Check,
  Copy,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FAQItem {
  id: number;
  active: boolean;
  question: string;
  response: string;
  url: string;
}

interface DashboardState {
  botActive: boolean;
  companyName: string;
  greetingActive: boolean;
  greetingMessage: string;
  greetingMediaUrl: string;
  greetingLink: string;
  responseDelay: number;
  faqs: FAQItem[];
  notificationActive: boolean;
  notificationPhone: string;
  awayModeActive: boolean;
  awayModeMessage: string;
  awayModeMediaUrl: string;
  exemplosregras: string;
  exemplosclass: string;
}

interface UserData {
  id: number;
  login: string;
  quepasakey: string;
  nomeEmpresa: string;
  botativo: string | boolean;
  MSGSaudacaoactive: string | boolean;
  MSGSaudacao: string;
  MSGSaudacaourl: string;
  MSGSaudacaolink?: string;
  delayresponse: number;
  notificanumero: string | boolean;
  whatsapp2: string;
  MODOausente?: boolean;
  MODOausenteMSG?: string;
  MODOausenteurl?: string;
  plano?: string | null;
  q1: string;
  q1response: string;
  q1url: string;
  q2: string;
  q2response: string;
  q2url: string;
  q3: string;
  q3response: string;
  q3url: string;
  q4: string;
  q4response: string;
  q4url: string;
  q5: string;
  q5response: string;
  q5url: string;
  q6: string;
  q6response: string;
  q6url: string;
  q7: string;
  q7response: string;
  q7url: string;
  q8: string;
  q8response: string;
  q8url: string;
  q9: string;
  q9response: string;
  q9url: string;
  q10: string;
  q10response: string;
  q10url: string;
  q11?: string;
  q11response?: string;
  q11url?: string;
  q12?: string;
  q12response?: string;
  q12url?: string;
  q13?: string;
  q13response?: string;
  q13url?: string;
  q14?: string;
  q14response?: string;
  q14url?: string;
  q15?: string;
  q15response?: string;
  q15url?: string;
  q16?: string;
  q16response?: string;
  q16url?: string;
  q17?: string;
  q17response?: string;
  q17url?: string;
  q18?: string;
  q18response?: string;
  q18url?: string;
  q19?: string;
  q19response?: string;
  q19url?: string;
  q20?: string;
  q20response?: string;
  q20url?: string;
}

interface DashboardProps {
  onLogout: () => void;
  userData: UserData | null;
}

interface LeadStats {
  totalConversations: number;
  uniqueClients: number;
}

const AutoResizePreviewTextarea = ({ value }: { value: string }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      disabled
      value={value}
      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground resize-none overflow-hidden"
      style={{ minHeight: '40px' }}
    />
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, userData }) => {
  const toBooleanValue = (value: string | boolean | null | undefined): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value === "true" || value === "1";
    }
    return false;
  };

  // Track plan locally for reactivity
  type PlanKey = "basic" | "premium" | "enterprise";
  const PLAN_LIMITS: Record<PlanKey, number> = { basic: 10, premium: 20, enterprise: 50 };
  const PLAN_PRICES: Record<PlanKey, number> = { basic: 97, premium: 127, enterprise: 197 };
  const PLAN_LABELS: Record<PlanKey, string> = { basic: "Basic", premium: "Premium", enterprise: "Enterprise" };
  const normalizePlan = (raw: string | null | undefined): PlanKey => {
    const v = (raw ?? "").toLowerCase().trim();
    if (v === "enterprise") return "enterprise";
    if (v === "premium" || v === "full") return "premium";
    return "basic";
  };
  const [currentPlan, setCurrentPlan] = useState<PlanKey>(normalizePlan(userData?.plano));
  const maxFaqs = PLAN_LIMITS[currentPlan];

  // Initialize FAQs state with dynamic count
  const initializeFaqs = (count: number, data?: UserData | null): FAQItem[] => {
    const faqs: FAQItem[] = [];
    for (let i = 1; i <= count; i++) {
      const questionKey = `q${i}` as keyof UserData;
      const responseKey = `q${i}response` as keyof UserData;
      const urlKey = `q${i}url` as keyof UserData;

      faqs.push({
        id: i,
        active: data ? !!(data[questionKey] || data[responseKey]) : false,
        question: data ? ((data[questionKey] as string) || "") : "",
        response: data ? ((data[responseKey] as string) || "") : "",
        url: data ? ((data[urlKey] as string) || "") : "",
      });
    }
    return faqs;
  };

  const [state, setState] = useState<DashboardState>({
    botActive: true,
    companyName: "Minha Empresa",
    greetingActive: true,
    greetingMessage: "Olá! Como posso ajudá-lo hoje?",
    greetingMediaUrl: "",
    greetingLink: "",
    responseDelay: 3,
    notificationActive: false,
    notificationPhone: "",
    awayModeActive: false,
    awayModeMessage: "",
    awayModeMediaUrl: "",
    exemplosregras: "",
    exemplosclass: "",
    faqs: initializeFaqs(maxFaqs),
  });
  const [saving, setSaving] = useState(false);
  
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [leadStats, setLeadStats] = useState<LeadStats>({
    totalConversations: 0,
    uniqueClients: 0,
  });
  const [activeTab, setActiveTab] = useState("main");
  const [searchFilter, setSearchFilter] = useState("");
  const [mediaFilter, setMediaFilter] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [greetingUploading, setGreetingUploading] = useState(false);

  // Backup/Restore state
  const [backups, setBackups] = useState<Array<{ id: number; created_at: string }>>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [previewBackupData, setPreviewBackupData] = useState<any>(null);
  const [showBackupPreview, setShowBackupPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Reconectar WhatsApp
  const [reconectarOpen, setReconectarOpen] = useState(false);
  const [reconectarCodigo, setReconectarCodigo] = useState<string | null>(null);
  const [reconectarLoading, setReconectarLoading] = useState(false);
  const [reconectarVerificando, setReconectarVerificando] = useState(false);
  const [reconectarConectado, setReconectarConectado] = useState(false);
  const [reconectarErro, setReconectarErro] = useState<string | null>(null);
  const reconectarPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Refs for file inputs in advanced settings
  const greetingImageInputRef = useRef<HTMLInputElement>(null);
  const greetingAudioInputRef = useRef<HTMLInputElement>(null);
  const greetingPdfInputRef = useRef<HTMLInputElement>(null);

  const STORAGE_BUCKET_URL = "https://rudtxgwzqrsvrdniqvav.supabase.co/storage/v1/object/public/rapdex-media";

  useEffect(() => {
    const loadLeadStats = async () => {
      if (!userData?.login) return;

      try {
        const { data: conversations, error } = await supabase
          .from("rapdex_conversations")
          .select("whatsapp_cli")
          .eq("login", userData.login);

        if (error) {
          console.error("Error loading lead stats:", error);
          return;
        }

        const uniqueClients = new Set(
          (conversations ?? []).map((c: any) => c.whatsapp_cli)
        ).size;
        const totalConversations = (conversations ?? []).length;

        setLeadStats({
          totalConversations,
          uniqueClients,
        });
      } catch (error) {
        console.error("Error loading lead stats:", error);
      }
    };

    loadLeadStats();
  }, [userData?.login]);

  useEffect(() => {
    if (userData) {
      setState({
        botActive: toBooleanValue(userData.botativo),
        companyName: userData.nomeEmpresa || "Minha Empresa",
        greetingActive: toBooleanValue(userData.MSGSaudacaoactive),
        greetingMessage: userData.MSGSaudacao || "Olá! Como posso ajudá-lo hoje?",
        greetingMediaUrl: userData.MSGSaudacaourl || "",
        greetingLink: userData.MSGSaudacaolink || "",
        responseDelay: Number(userData.delayresponse) || 3,
        notificationActive: toBooleanValue(userData.notificanumero),
        notificationPhone: userData.whatsapp2 || "",
        awayModeActive: toBooleanValue(userData.MODOausente),
        awayModeMessage: userData.MODOausenteMSG || "",
        awayModeMediaUrl: userData.MODOausenteurl || "",
        exemplosregras: (userData as any).exemplosregras || "",
        exemplosclass: (userData as any).exemplosclass || "",
        faqs: initializeFaqs(maxFaqs, userData),
      });
    }
  }, [userData, maxFaqs]);

  // Load backups list
  const loadBackups = async () => {
    // Backup system não disponível na versão atual
    setBackups([]);
  };

  useEffect(() => {
    loadBackups();
  }, [userData?.login]);

  const updateFAQ = (id: number, field: keyof FAQItem, value: any) => {
    setState((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq) =>
        faq.id === id ? { ...faq, [field]: value } : faq
      ),
    }));
  };

  const updateState = (updates: Partial<DashboardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleChangePlan = async (target: PlanKey) => {
    if (!userData || changingPlan || target === currentPlan) return;
    setChangingPlan(true);
    const previousPlan = currentPlan;
    try {
      const { error } = await supabase
        .from("rapdex_accounts")
        .update({ plano: target })
        .eq("login", userData.login);
      if (error) {
        toast.error("Erro ao atualizar plano: " + error.message);
        return;
      }

      // Build full FAQ backup (all 50 slots, empty when not configured)
      const faqsBackup = Array.from({ length: 50 }, (_, i) => {
        const n = i + 1;
        const item = state.faqs.find((f) => f.id === n);
        return {
          n,
          question: item?.question ?? "",
          response: item?.response ?? "",
          url: item?.url ?? "",
        };
      });

      const payload = {
        event: "plan_change",
        timestamp: new Date().toISOString(),
        user: {
          id: userData.id,
          login: userData.login,
          nomeEmpresa: userData.nomeEmpresa,
          whatsapp2: userData.whatsapp2,
          notificanumero: userData.notificanumero,
        },
        plan: {
          from: previousPlan,
          to: target,
          price: PLAN_PRICES[target],
          maxFaqs: PLAN_LIMITS[target],
        },
        backup: {
          botativo: userData.botativo,
          MSGSaudacaoactive: userData.MSGSaudacaoactive,
          MSGSaudacao: userData.MSGSaudacao,
          delayresponse: userData.delayresponse,
          faqs: faqsBackup,
        },
      };

      try {
        await fetch(
          "https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/trocadeplanorapdex",
          {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } catch (whErr) {
        console.error("Webhook trocadeplanorapdex error", whErr);
      }

      (userData as any).plano = target;
      setCurrentPlan(target);
      setState((prev) => ({
        ...prev,
        faqs: initializeFaqs(PLAN_LIMITS[target], userData),
      }));
      toast.success("Seu plano foi alterado com sucesso!");
      setShowPlanDialog(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar plano");
    } finally {
      setChangingPlan(false);
    }
  };

  const handleExportFAQs = () => {
    try {
      const lines: string[] = [];
      lines.push("RAPDEX - Perguntas e Respostas");
      lines.push(`Cliente: ${userData?.login || ""}`);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      lines.push(
        `Data: ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
      );
      lines.push("");
      lines.push("========================================");
      lines.push("");

      let count = 0;
      state.faqs.forEach((faq, idx) => {
        const q = (faq.question || "").trim();
        const r = (faq.response || "").trim();
        if (!q && !r) return;
        const n = idx + 1;
        count++;
        lines.push(`Pergunta ${n}:`);
        lines.push(q || "(vazia)");
        lines.push("");
        lines.push(`Resposta ${n}:`);
        lines.push(r || "(vazia)");

        const urls = (faq.url || "").split(";").map((u) => u.trim()).filter(Boolean);
        if (urls.length > 0) {
          const lower = urls[0].toLowerCase();
          let mediaLine = "";
          if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            const labels = urls.map((_, i) => `Imagem ${i + 1}`).join(", ");
            mediaLine = `Mídia: ${labels}`;
          } else if (lower.endsWith(".ogg") || lower.endsWith(".webm")) {
            mediaLine = "Mídia: Áudio";
          } else if (lower.endsWith(".pdf")) {
            mediaLine = "Mídia: Catálogo PDF";
          }
          if (mediaLine) {
            lines.push("");
            lines.push(mediaLine);
          }
        }

        lines.push("");
        lines.push("----------------------------------------");
        lines.push("");
      });

      if (count === 0) {
        toast.error("Nenhuma pergunta preenchida para exportar.");
        return;
      }

      const content = lines.join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const safeLogin = (userData?.login || "cliente").replace(/[^a-zA-Z0-9]/g, "_");
      a.href = url;
      a.download = `perguntas-respostas-${safeLogin}-${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Arquivo exportado com sucesso!");
    } catch (e: any) {
      toast.error(`Erro ao exportar: ${e?.message || "desconhecido"}`);
    }
  };

  const handleSaveConfigurations = async () => {
    if (!userData) return;

    setSaving(true);
    try {
      // 1. Salva configurações da conta
      const { error } = await supabase
        .from("rapdex_accounts")
        .update({
          nome_empresa:    state.companyName,
          bot_ativo:       Boolean(state.botActive),
          saudacao_ativa:  Boolean(state.greetingActive),
          saudacao_texto:  state.greetingMessage,
          saudacao_url:    state.greetingMediaUrl   || null,
          saudacao_link:   state.greetingLink       || null,
          delay_resposta:  Number(state.responseDelay) || 0,
          notifica_ativo:  Boolean(state.notificationActive),
          notifica_numero: state.notificationPhone  || null,
          ausente_ativo:   Boolean(state.awayModeActive),
          ausente_texto:   state.awayModeMessage    || null,
          ausente_url:     state.awayModeMediaUrl   || null,
        })
        .eq("login", userData.login);

      if (error) {
        toast.error(`Erro ao salvar: ${error.message}`);
        return;
      }

      // 2. Upsert das FAQs (tabela separada)
      const faqsData = state.faqs
        .filter((faq) => faq.question.trim() || faq.response.trim())
        .map((faq) => ({
          login:     userData.login,
          slot:      faq.id,
          ativa:     faq.active,
          pergunta:  faq.question,
          resposta:  faq.response,
          midia_url: faq.url || null,
          midia_tipo: null as null,
        }));

      if (faqsData.length > 0) {
        const { error: faqErr } = await supabase
          .from("rapdex_faqs")
          .upsert(faqsData, { onConflict: "login,slot" });
        if (faqErr) console.error("Erro ao salvar FAQs:", faqErr);
      }

      toast.success("Configurações salvas com sucesso!");

      // 3. Refresh do estado a partir do banco
      const [{ data: acc }, { data: faqs }] = await Promise.all([
        supabase.from("rapdex_accounts").select("*").eq("login", userData.login).single(),
        supabase.from("rapdex_faqs").select("*").eq("login", userData.login).order("slot"),
      ]);

      if (acc) {
        const faqsFlat: Record<string, string> = {};
        (faqs ?? []).forEach((f: any) => {
          faqsFlat[`q${f.slot}`]         = f.pergunta  ?? "";
          faqsFlat[`q${f.slot}response`] = f.resposta  ?? "";
          faqsFlat[`q${f.slot}url`]      = f.midia_url ?? "";
        });

        setState((prev) => ({
          ...prev,
          botActive:         (acc as any).bot_ativo,
          companyName:       (acc as any).nome_empresa    || "Minha Empresa",
          greetingActive:    (acc as any).saudacao_ativa,
          greetingMessage:   (acc as any).saudacao_texto  || "",
          greetingMediaUrl:  (acc as any).saudacao_url    || "",
          greetingLink:      (acc as any).saudacao_link   || "",
          responseDelay:     (acc as any).delay_resposta  || 3,
          notificationActive:(acc as any).notifica_ativo,
          notificationPhone: (acc as any).notifica_numero || "",
          awayModeActive:    (acc as any).ausente_ativo,
          awayModeMessage:   (acc as any).ausente_texto   || "",
          awayModeMediaUrl:  (acc as any).ausente_url     || "",
          faqs: initializeFaqs(maxFaqs, { ...userData, ...faqsFlat } as any),
        }));
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err?.message || "Falha inesperada"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreBackup = async () => {
    toast.info("Função de backup não disponível nesta versão.");
    setShowRestoreConfirm(false);
  };

  const handlePreviewBackup = async () => {
    toast.info("Função de backup não disponível nesta versão.");
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `+${numbers}`;
    if (numbers.length <= 4)
      return `+${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    if (numbers.length <= 6)
      return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`;
    if (numbers.length <= 10)
      return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 8)}-${numbers.slice(8)}`;
    return `+${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  // File upload helpers for greeting media
  type FileType = "image" | "audio" | "pdf";

  const getFileTypeFromUrl = (url: string): FileType | null => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image";
    if (lower.endsWith(".ogg")) return "audio";
    if (lower.endsWith(".pdf")) return "pdf";
    return null;
  };

  const getFileNameFromUrl = (url: string): string => {
    if (!url) return "";
    const parts = url.split("/");
    return parts[parts.length - 1] || "";
  };

  const handleGreetingUpload = async (file: File, type: FileType) => {
    if (!file || !userData?.login) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions: Record<FileType, string[]> = {
      image: ["jpg", "jpeg"],
      audio: ["ogg"],
      pdf: ["pdf"],
    };

    if (!ext || !validExtensions[type].includes(ext)) {
      toast.error(`Arquivo inválido. Extensões aceitas: ${validExtensions[type].join(", ")}`);
      return;
    }

    setGreetingUploading(true);

    try {
      const timestamp = Date.now();
      const sanitizedLogin = userData.login.replace(/[^a-zA-Z0-9]/g, "_");
      const newFileName = `${sanitizedLogin}_greeting_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("rapi10")
        .upload(newFileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        toast.error(`Erro no upload: ${uploadError.message}`);
        return;
      }

      const fullUrl = `${STORAGE_BUCKET_URL}/${newFileName}`;
      updateState({ greetingMediaUrl: fullUrl });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao enviar arquivo: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setGreetingUploading(false);
    }
  };

  const handleRemoveGreetingMedia = async () => {
    if (!state.greetingMediaUrl) return;

    const fileNameToDelete = getFileNameFromUrl(state.greetingMediaUrl);

    if (fileNameToDelete && state.greetingMediaUrl.includes(STORAGE_BUCKET_URL)) {
      try {
        await supabase.storage.from("rapi10").remove([fileNameToDelete]);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }

    updateState({ greetingMediaUrl: "" });
  };

  const pararReconectarPolling = () => {
    if (reconectarPollingRef.current) {
      clearInterval(reconectarPollingRef.current);
      reconectarPollingRef.current = null;
    }
  };

  const iniciarReconexao = async () => {
    if (!userData?.quepasakey || !userData?.login) return;
    setReconectarLoading(true);
    setReconectarErro(null);
    setReconectarCodigo(null);
    setReconectarConectado(false);

    try {
      const params = new URLSearchParams({
        celular: userData.login,
        dispositivo: "celular",
        nome_empresa: userData.nomeEmpresa || userData.login,
      });
      const res = await fetch(`/api/pairing-code?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.ok || !data.code) {
        setReconectarErro(data.error || "Erro ao gerar código. Tente novamente.");
        return;
      }

      setReconectarCodigo(data.code);
      setReconectarVerificando(true);

      let tentativas = 0;
      reconectarPollingRef.current = setInterval(async () => {
        tentativas++;
        if (tentativas > 30) {
          pararReconectarPolling();
          setReconectarVerificando(false);
          setReconectarErro("Tempo esgotado. Tente novamente.");
          return;
        }
        try {
          const statusRes = await fetch(
            `/api/status-conexao?token=${userData.quepasakey}`
          );
          const statusData = await statusRes.json();
          if (statusData.conectado) {
            pararReconectarPolling();
            setReconectarVerificando(false);
            setReconectarConectado(true);
          }
        } catch {
          // silencia erros de polling
        }
      }, 10_000);

      setTimeout(() => {
        pararReconectarPolling();
        setReconectarVerificando(false);
      }, 300_000);
    } catch {
      setReconectarErro("Erro de conexão. Tente novamente.");
    } finally {
      setReconectarLoading(false);
    }
  };

  // Main Screen
  if (activeTab === "main") {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <header className="bg-gradient-header text-primary-foreground shadow-elevation-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                    RAPDEX
                  </h1>
                  <p className="text-[10px] sm:text-xs text-primary-foreground/70 hidden sm:block">
                    Resposta Automática Personalizada
                  </p>
                </div>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-xs sm:text-sm text-primary-foreground/80">
                  Login: <span className="font-semibold">{userData?.login}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setReconectarOpen(true);
                    setReconectarCodigo(null);
                    setReconectarConectado(false);
                    setReconectarErro(null);
                    setReconectarVerificando(false);
                    pararReconectarPolling();
                  }}
                  className="h-9 sm:h-10"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Reconectar</span>
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={onLogout}
                  className="h-9 sm:h-10"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dialog Reconectar WhatsApp */}
        <Dialog
          open={reconectarOpen}
          onOpenChange={(open) => {
            if (!open) pararReconectarPolling();
            setReconectarOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#3F5E96]" />
                Reconectar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Gere um código de pareamento e insira no WhatsApp para reconectar seu número.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {reconectarConectado ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-center font-semibold text-green-700">WhatsApp reconectado!</p>
                  <p className="text-center text-sm text-muted-foreground">
                    Seu bot está ativo e pronto para responder.
                  </p>
                </div>
              ) : reconectarErro ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <WifiOff className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-center text-sm text-red-600">{reconectarErro}</p>
                  <Button variant="outline" onClick={iniciarReconexao} disabled={reconectarLoading}>
                    {reconectarLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Tentar novamente
                  </Button>
                </div>
              ) : reconectarCodigo ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    No WhatsApp, vá em <strong>Configurações → Dispositivos conectados → Conectar dispositivo</strong> e insira o código:
                  </p>
                  <div className="flex items-center gap-3 bg-muted rounded-xl px-6 py-4">
                    <span className="font-mono text-3xl font-bold tracking-widest text-[#3F5E96]">
                      {reconectarCodigo}
                    </span>
                    <button
                      className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(reconectarCodigo!);
                        toast.success("Código copiado!");
                      }}
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  {reconectarVerificando && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguardando confirmação...
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Clique abaixo para gerar um novo código de pareamento e reconectar seu WhatsApp.
                  </p>
                  <Button
                    onClick={iniciarReconexao}
                    disabled={reconectarLoading}
                    className="w-full"
                  >
                    {reconectarLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Gerando código...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Gerar código de pareamento
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {(reconectarConectado || reconectarErro) && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setReconectarOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-elevation-3 hover:shadow-elevation-4 transition-all duration-[400ms] animate-slide-up group">
              <CardHeader className="bg-gradient-to-r from-[#3F5E96]/15 to-[#3F5E96]/5 rounded-t-2xl pb-2 sm:pb-3">
                <CardTitle className="flex items-center space-x-2 text-[#3F5E96] text-base sm:text-lg">
                  <Users className="w-5 h-5" />
                  <span>Clientes Únicos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="text-center">
                  <div className="font-display text-4xl sm:text-5xl font-bold text-[#3F5E96] mb-2 group-hover:scale-105 transition-transform duration-300">
                    {leadStats.uniqueClients}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-body">
                    Total de clientes que você conversou
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elevation-3 hover:shadow-elevation-4 transition-all duration-[400ms] animate-slide-up group" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="bg-gradient-to-r from-[#243B55]/15 to-[#243B55]/5 rounded-t-2xl pb-2 sm:pb-3">
                <CardTitle className="flex items-center space-x-2 text-[#243B55] text-base sm:text-lg">
                  <MessageSquare className="w-5 h-5" />
                  <span>Total de Mensagens</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="text-center">
                  <div className="font-display text-4xl sm:text-5xl font-bold text-[#243B55] mb-2 group-hover:scale-105 transition-transform duration-300">
                    {leadStats.totalConversations}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-body">
                    Total de interações registradas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <button
              onClick={() => {
                if (currentPlan === "basic") {
                  const allFilled = state.faqs.slice(0, 10).every(f => f.question.trim() !== "" || f.response.trim() !== "");
                  if (allFilled) {
                    setShowPlanDialog(true);
                  }
                }
                setActiveTab("perguntas");
              }}
              className="relative overflow-hidden flex items-center justify-center gap-3 py-5 sm:py-7 px-6 sm:px-8 text-lg sm:text-xl font-display font-bold bg-gradient-to-r from-[#141E30] via-[#243B55] to-[#3F5E96] text-white rounded-2xl shadow-elevation-4 hover:shadow-glow transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] touch-target group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#3F5E96] to-[#5A7FBA] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
              <span className="relative z-10">PERGUNTAS</span>
            </button>

            <button
              onClick={() => setActiveTab("greeting")}
              className="relative overflow-hidden flex items-center justify-center gap-3 py-5 sm:py-7 px-6 sm:px-8 text-lg sm:text-xl font-display font-bold bg-gradient-to-r from-[#243B55] via-[#3F5E96] to-[#243B55] text-white rounded-2xl shadow-elevation-4 hover:shadow-glow transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] touch-target group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#3F5E96] to-[#5A7FBA] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
              <span className="relative z-10">MENSAGEM INICIAL</span>
            </button>

            <button
              onClick={() => setActiveTab("advanced")}
              className="relative overflow-hidden flex items-center justify-center gap-3 py-5 sm:py-7 px-6 sm:px-8 text-lg sm:text-xl font-display font-bold bg-gradient-to-r from-[#3F5E96] via-[#243B55] to-[#141E30] text-white rounded-2xl shadow-elevation-4 hover:shadow-glow transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] touch-target group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#5A7FBA] to-[#3F5E96] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
              <span className="relative z-10">CONFIG. AVANÇADAS</span>
            </button>
          </div>

          {/* Away Mode */}
          <AwayMode
            awayModeActive={state.awayModeActive}
            awayModeMessage={state.awayModeMessage}
            awayModeMediaUrl={state.awayModeMediaUrl}
            onUpdate={async (updates) => {
              updateState(updates);
              // If awayModeActive is being toggled, save immediately to database
              if ('awayModeActive' in updates && userData) {
                try {
                  const { error } = await supabase
                    .from("rapdex_accounts")
                    .update({ ausente_ativo: Boolean(updates.awayModeActive) })
                    .eq("login", userData.login);
                  
                  if (error) {
                    toast.error("Erro ao atualizar modo ausente");
                    console.error("Error updating away mode:", error);
                  } else {
                    toast.success(updates.awayModeActive ? "Modo ausente ativado" : "Modo ausente desativado");
                  }
                } catch (err) {
                  console.error("Error updating away mode:", err);
                  toast.error("Erro ao atualizar modo ausente");
                }
              }
            }}
            userData={userData}
          />

          {/* Save Button for Away Mode - Always visible when mode is active or has content */}
          {(state.awayModeActive || state.awayModeMessage || state.awayModeMediaUrl) && (
            <div className="flex justify-center">
              <Button
                variant="gradient"
                size="lg"
                className="px-8 touch-target"
                onClick={handleSaveConfigurations}
                disabled={saving}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Settings className="w-5 h-5" />
                )}
                {saving ? "Salvando..." : "Salvar Modo Ausente"}
              </Button>
            </div>
          )}

          {/* Leads Button - Bottom */}
          <div className="pt-4 sm:pt-6">
            <button
              onClick={() => setActiveTab("leads")}
              className="flex items-center justify-center gap-3 w-full py-4 sm:py-5 px-6 text-base sm:text-lg font-display font-semibold bg-white text-[#3F5E96] border-2 border-[#3F5E96]/20 rounded-2xl shadow-elevation-2 hover:shadow-elevation-3 hover:border-[#3F5E96]/40 hover:bg-[#3F5E96]/5 transition-all duration-[400ms] touch-target group"
            >
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>Histórico de Leads</span>
            </button>
          </div>

          {/* Plan Button */}
          <div>
            <button
              onClick={() => setShowPlanDialog(true)}
              className="flex items-center justify-center gap-3 w-full py-4 sm:py-5 px-6 text-base sm:text-lg font-display font-semibold bg-gradient-to-r from-[#3F5E96]/10 to-[#243B55]/10 text-[#3F5E96] border-2 border-[#3F5E96]/20 rounded-2xl shadow-elevation-2 hover:shadow-elevation-3 hover:border-[#3F5E96]/40 transition-all duration-[400ms] touch-target group"
            >
              <Crown className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 text-yellow-500" />
              <span>Plano {PLAN_LABELS[currentPlan]}</span>
              <span className="ml-auto text-sm font-body text-muted-foreground">
                {maxFaqs} perguntas
              </span>
            </button>
          </div>

          {/* Tutorial Link */}
          <div className="text-center pt-4 sm:pt-6">
            <a
              href="https://www.maistempoai.com.br/faq"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-[#3F5E96] hover:text-[#5A7FBA] transition-colors duration-300 font-body text-sm sm:text-base group"
            >
              <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="underline-offset-4 hover:underline">Tutorial de Configuração</span>
            </a>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 sm:pt-8 pb-4 text-xs text-muted-foreground border-t border-[#3F5E96]/10 mt-6 sm:mt-8 font-body">
            MaisTempo.ai - 2025 - ® Todos os direitos reservados.
          </div>
        </main>
      </div>
    );
  }

  // Leads Screen
  if (activeTab === "leads") {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <header className="bg-gradient-header text-primary-foreground shadow-elevation-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setActiveTab("main")}
                className="h-9 sm:h-10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <h1 className="font-display text-lg sm:text-xl font-bold">
                Histórico de Leads
              </h1>
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Card className="shadow-elevation-3">
            <CardHeader className="bg-gradient-to-r from-secondary/10 to-transparent rounded-t-2xl">
              <CardTitle className="flex items-center space-x-2 text-secondary">
                <Users className="w-5 h-5" />
                <span>Histórico de Interações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LeadsHistory userData={userData} />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Derived values for greeting preview
  const greetingFileType = getFileTypeFromUrl(state.greetingMediaUrl);
  const greetingFileName = getFileNameFromUrl(state.greetingMediaUrl);

  // GREETING MESSAGE Screen (Mensagem Inicial)
  if (activeTab === "greeting") {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <header className="bg-gradient-header text-primary-foreground shadow-elevation-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setActiveTab("main")}
                className="h-9 sm:h-10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <h1 className="font-display text-lg sm:text-xl font-bold">
                Mensagem Inicial
              </h1>
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
          <TooltipProvider>
            {/* Mensagem de Saudação */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl">
                <CardTitle className="flex items-center justify-between text-primary">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Mensagem de Saudação</span>
                  </div>
                  <Switch
                    checked={state.greetingActive}
                    onCheckedChange={(checked) => updateState({ greetingActive: checked })}
                  />
                </CardTitle>
              </CardHeader>
              {state.greetingActive && (
                <CardContent className="space-y-4 pt-4 sm:pt-6">
                  <p className="text-sm text-muted-foreground font-body">
                    Primeira mensagem enviada aos usuários
                  </p>

                  <MaterialTextarea
                    label="Mensagem de Saudação"
                    helperText="Digite a mensagem que será enviada como saudação"
                    value={state.greetingMessage}
                    onChange={(e) => updateState({ greetingMessage: e.target.value })}
                  />

                  {/* File Upload Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-display font-semibold text-foreground">
                        Anexar Mídia
                      </span>
                      <span className="text-xs text-muted-foreground">(escolha 1)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-primary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>MÍDIAS ACEITAS: imagem = .jpg, áudio = .ogg, catálogo = .pdf</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Hidden file inputs */}
                    <input
                      ref={greetingImageInputRef}
                      type="file"
                      accept=".jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGreetingUpload(file, "image");
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={greetingAudioInputRef}
                      type="file"
                      accept=".ogg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGreetingUpload(file, "audio");
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={greetingPdfInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGreetingUpload(file, "pdf");
                        e.target.value = "";
                      }}
                    />

                    {/* Upload buttons */}
                    {!state.greetingMediaUrl && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => greetingImageInputRef.current?.click()}
                          disabled={greetingUploading}
                          className="flex items-center gap-2 touch-target"
                        >
                          {greetingUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                          <span>Imagem</span>
                          <span className="text-xs opacity-60">.jpg</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => greetingAudioInputRef.current?.click()}
                          disabled={greetingUploading}
                          className="flex items-center gap-2 touch-target"
                        >
                          {greetingUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                          <span>Áudio</span>
                          <span className="text-xs opacity-60">.ogg</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => greetingPdfInputRef.current?.click()}
                          disabled={greetingUploading}
                          className="flex items-center gap-2 touch-target"
                        >
                          {greetingUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          <span>Catálogo</span>
                          <span className="text-xs opacity-60">.pdf</span>
                        </Button>
                      </div>
                    )}

                    {/* Preview */}
                    {state.greetingMediaUrl && greetingFileType && (
                      <div className="mt-3 p-3 bg-surface-variant rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          {greetingFileType === "image" && (
                            <div className="relative">
                              <img
                                src={state.greetingMediaUrl}
                                alt="Preview"
                                className="h-16 w-16 rounded-xl object-cover border border-border"
                                onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                              />
                            </div>
                          )}
                          {greetingFileType === "audio" && (
                            <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-primary/10">
                              <Music className="w-8 h-8 text-primary" />
                            </div>
                          )}
                          {greetingFileType === "pdf" && (
                            <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-secondary/10">
                              <FileText className="w-8 h-8 text-secondary" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-display font-semibold text-foreground truncate">
                              {greetingFileName}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase font-body">
                              {greetingFileType === "image" ? "Imagem JPG" : greetingFileType === "audio" ? "Áudio OGG" : "Catálogo PDF"}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveGreetingMedia}
                            disabled={greetingUploading}
                            className="text-error hover:text-error hover:bg-error/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Uploading state */}
                    {greetingUploading && (
                      <div className="flex items-center gap-2 text-sm text-primary font-body">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando arquivo...</span>
                      </div>
                    )}
                  </div>

                  {/* Link Field */}
                  <MaterialInput
                    label="Link (opcional)"
                    helperText="URL que será enviada junto com a saudação"
                    value={state.greetingLink}
                    onChange={(e) => updateState({ greetingLink: e.target.value })}
                    placeholder="https://exemplo.com"
                  />
                </CardContent>
              )}
            </Card>
          </TooltipProvider>

          {/* Save Button */}
          <div className="flex justify-center pt-4 sm:pt-8">
            <Button
              variant="gradient"
              size="xl"
              className="px-8 sm:px-12 touch-target"
              onClick={handleSaveConfigurations}
              disabled={saving}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 sm:pt-8 pb-4 text-xs text-muted-foreground border-t border-border mt-6 sm:mt-8 font-body">
            MaisTempo.ai - 2025 - ® Todos os direitos reservados.
          </div>
        </main>
      </div>
    );
  }

  // ADVANCED SETTINGS Screen
  if (activeTab === "advanced") {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <header className="bg-gradient-header text-primary-foreground shadow-elevation-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setActiveTab("main")}
                className="h-9 sm:h-10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <h1 className="font-display text-lg sm:text-xl font-bold">
                Config. Avançadas
              </h1>
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
          <TooltipProvider>
            {/* Tempo de Resposta */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl">
                <CardTitle className="flex items-center space-x-2 text-primary">
                  <Clock className="w-5 h-5" />
                  <span>Tempo para Resposta</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-primary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>TEMPO EM SEGUNDOS - 60 segundos = 1 minuto</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <MaterialInput
                      label=""
                      helperText="Digite em segundos (1-60)"
                      type="number"
                      min="1"
                      max="60"
                      value={state.responseDelay}
                      onChange={(e) => updateState({ responseDelay: parseInt(e.target.value) || 3 })}
                      className="w-full sm:w-48"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notificações */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-warning/10 to-transparent rounded-t-2xl">
                <CardTitle className="flex items-center justify-between text-warning">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <span>Notificações</span>
                  </div>
                  <Switch
                    checked={state.notificationActive}
                    onCheckedChange={(checked) => updateState({ notificationActive: checked })}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-4">
                <p className="text-sm text-muted-foreground font-body">
                  Receba notificações para mensagens não cadastradas
                </p>

                {state.notificationActive && (
                  <MaterialInput
                    label="Número WhatsApp para Notificações"
                    helperText="Exemplo: +55 11 99999-9999"
                    value={state.notificationPhone}
                    onChange={(e) => updateState({ notificationPhone: formatPhoneNumber(e.target.value) })}
                  />
                )}
              </CardContent>
            </Card>
          </TooltipProvider>

            {/* Regras de Perguntas */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl">
                <CardTitle className="flex items-center space-x-2 text-primary">
                  <HelpCircle className="w-5 h-5" />
                  <span>Regras de Perguntas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-4">
                <p className="text-sm text-muted-foreground font-body">
                  Regras de perguntas que o bot não deve responder ou contextos específicos
                </p>
                <MaterialTextarea
                  label="Regras"
                  helperText="Ex: Não responder sobre preços, não falar de concorrentes..."
                  value={state.exemplosregras}
                  onChange={(e) => updateState({ exemplosregras: e.target.value })}
                />
                <div className="flex justify-end">
                  <Button
                    variant="filled"
                    size="sm"
                    disabled={saving}
                    onClick={async () => {
                      if (!userData) return;
                      setSaving(true);
                      try {
                        const { error } = await supabase
                          .from("rapdex_accounts")
                          .update({ ia_regras: state.exemplosregras })
                          .eq("login", userData.login);
                        if (error) throw error;
                        toast.success("Regras salvas com sucesso!");
                      } catch (err: any) {
                        toast.error("Erro ao salvar regras: " + (err?.message || ""));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar Regras"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Exemplos de Classificação */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-secondary/10 to-transparent rounded-t-2xl">
                <CardTitle className="flex items-center space-x-2 text-secondary">
                  <BarChart3 className="w-5 h-5" />
                  <span>Exemplos de Classificação</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-4">
                <p className="text-sm text-muted-foreground font-body">
                  Exemplos de classificações e gatilhos específicos (ex: "Vocês dão desconto?" → considerar resposta 0)
                </p>
                <MaterialTextarea
                  label="Classificações"
                  helperText="Ex: 'Vocês dão desconto?' -> considerar resposta 0"
                  value={state.exemplosclass}
                  onChange={(e) => updateState({ exemplosclass: e.target.value })}
                />
                <div className="flex justify-end">
                  <Button
                    variant="filled"
                    size="sm"
                    disabled={saving}
                    onClick={async () => {
                      if (!userData) return;
                      setSaving(true);
                      try {
                        const { error } = await supabase
                          .from("rapdex_accounts")
                          .update({ ia_classificacao: state.exemplosclass })
                          .eq("login", userData.login);
                        if (error) throw error;
                        toast.success("Classificações salvas com sucesso!");
                      } catch (err: any) {
                        toast.error("Erro ao salvar classificações: " + (err?.message || ""));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar Classificações"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Restaurar Versão Anterior */}
            <Card className="shadow-elevation-3 border-2 border-red-500">
              <CardHeader className="bg-gradient-to-r from-red-500/20 to-red-400/10 rounded-t-2xl">
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <History className="w-5 h-5" />
                  <span>Restaurar Versão Anterior</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-4">
                <p className="text-sm text-muted-foreground font-body">
                  Selecione um backup para restaurar suas perguntas. Máximo de 7 versões salvas automaticamente.
                </p>
                {backups.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum backup disponível ainda. Salve suas configurações para criar o primeiro backup.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedBackupId ?? ""}
                      onChange={(e) => setSelectedBackupId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full h-10 px-3 rounded-lg border-2 border-border bg-surface text-surface-foreground text-sm transition-all focus:border-primary focus:outline-none"
                    >
                      <option value="">Selecione um backup...</option>
                      {backups.map((bkp) => (
                        <option key={bkp.id} value={bkp.id}>
                          {new Date(bkp.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outlined"
                        size="sm"
                        disabled={!selectedBackupId || loadingPreview}
                        onClick={handlePreviewBackup}
                      >
                        {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Visualizar
                      </Button>
                      <Button
                        variant="filled"
                        size="sm"
                        disabled={!selectedBackupId || restoring}
                        onClick={() => setShowRestoreConfirm(true)}
                      >
                        {restoring ? "Restaurando..." : "Restaurar"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AlertDialog para confirmar restauração */}
            <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>TEM CERTEZA QUE DESEJA RECUPERAR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    SUAS PERGUNTAS ATUAIS SERÃO PERDIDAS. Os dados serão substituídos pelo backup selecionado e esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreBackup}>
                    Sim, Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Preview do Backup */}
            <Dialog open={showBackupPreview} onOpenChange={setShowBackupPreview}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Visualizar Backup
                  </DialogTitle>
                  <DialogDescription>
                    Pré-visualização das perguntas e respostas deste backup. Todos os campos estão bloqueados.
                  </DialogDescription>
                </DialogHeader>
                {previewBackupData && (
                  <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                    <Card className="border border-border">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-semibold">Mensagem de Saudação</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        <AutoResizePreviewTextarea value={previewBackupData.MSGSaudacao || ""} />
                        {previewBackupData.MSGSaudacaourl && (
                          <p className="text-xs text-muted-foreground truncate">📎 {previewBackupData.MSGSaudacaourl.split("/").pop()}</p>
                        )}
                      </CardContent>
                    </Card>
                    {Array.from({ length: maxFaqs }, (_, i) => i + 1).map((qNum) => {
                      const question = previewBackupData[`q${qNum}`] || "";
                      const response = previewBackupData[`q${qNum}response`] || "";
                      const urlKey = `q${qNum}url`;
                      const mediaUrl = previewBackupData[urlKey] || "";
                      if (!question && !response) return null;
                      return (
                        <Card key={qNum} className="border border-border">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-semibold">Pergunta {qNum}</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 space-y-2">
                            <input
                              disabled
                              value={question}
                              placeholder="Pergunta"
                              className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                            />
                            <AutoResizePreviewTextarea value={response} />
                            {mediaUrl && (
                              <div className="space-y-1">
                                {mediaUrl.split(";").map((u: string) => u.trim()).filter(Boolean).map((u: string, idx: number) => (
                                  <p key={idx} className="text-xs text-muted-foreground truncate">📎 {u.split("/").pop()}</p>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outlined" size="sm" onClick={() => setShowBackupPreview(false)}>
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4 sm:pt-8">
            <Button
              variant="outline"
              size="lg"
              className="flex items-center gap-2 touch-target"
              onClick={() => setShowChangePassword(true)}
            >
              <Key className="w-5 h-5" />
              Alterar Senha de Acesso
            </Button>
            <Button
              variant="gradient"
              size="xl"
              className="px-8 sm:px-12 touch-target"
              onClick={handleSaveConfigurations}
              disabled={saving}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>

          {/* Tutorial Link */}
          <div className="text-center pt-4 sm:pt-6">
            <a
              href="https://www.maistempoai.com.br/faq"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors font-body text-sm sm:text-base"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Tutorial de Configuração</span>
            </a>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 sm:pt-8 pb-4 text-xs text-muted-foreground border-t border-border mt-6 sm:mt-8 font-body">
            MaisTempo.ai - 2025 - ® Todos os direitos reservados.
          </div>
        </main>
      </div>
    );
  }

  // PERGUNTAS Screen (Configurations)
  return (
    <>
      {/* Plan Selection Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={(o) => !changingPlan && setShowPlanDialog(o)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-[#243B55]">
              DESEJA ALTERAR SEU PLANO?
            </DialogTitle>
            <DialogDescription className="text-center text-sm pt-1">
              Selecione abaixo o plano ideal para o seu negócio
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
            {(["basic", "premium", "enterprise"] as PlanKey[]).map((plan) => {
              const isCurrent = currentPlan === plan;
              const Icon = plan === "basic" ? Star : plan === "premium" ? Crown : Sparkles;
              const accent =
                plan === "basic"
                  ? { text: "text-[#3F5E96]", border: "border-[#3F5E96]", bg: "bg-[#3F5E96]/10", badge: "bg-[#3F5E96]" }
                  : plan === "premium"
                  ? { text: "text-yellow-500", border: "border-yellow-500", bg: "bg-yellow-500/10", badge: "bg-yellow-500" }
                  : { text: "text-purple-600", border: "border-purple-600", bg: "bg-purple-600/10", badge: "bg-purple-600" };
              return (
                <button
                  key={plan}
                  disabled={changingPlan || isCurrent}
                  onClick={() => handleChangePlan(plan)}
                  className={`relative rounded-2xl border-2 p-5 text-center transition-all duration-300 ${
                    isCurrent
                      ? `${accent.border} ${accent.bg} shadow-elevation-3 cursor-default`
                      : "border-border hover:shadow-elevation-2 cursor-pointer"
                  }`}
                >
                  {isCurrent && (
                    <div className={`absolute -top-2 left-1/2 -translate-x-1/2 ${accent.badge} text-white text-[10px] font-bold px-3 py-0.5 rounded-full`}>
                      ATUAL
                    </div>
                  )}
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${accent.text}`} />
                  <h3 className="font-display font-bold text-lg text-[#243B55]">
                    {PLAN_LABELS[plan]}
                  </h3>
                  <p className={`text-3xl font-bold ${accent.text} my-2`}>
                    {PLAN_LIMITS[plan]}
                  </p>
                  <p className="text-sm text-muted-foreground">perguntas</p>
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">a partir de</p>
                    <p className="text-xl font-bold text-[#243B55]">
                      R$ {PLAN_PRICES[plan].toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {changingPlan && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Atualizando plano...
            </div>
          )}
        </DialogContent>
      </Dialog>
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-gradient-header text-primary-foreground shadow-elevation-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Button
              variant="glass"
              size="sm"
              onClick={() => setActiveTab("main")}
              className="h-9 sm:h-10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <h1 className="font-display text-lg sm:text-xl font-bold">
              Perguntas e Configurações
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 sm:pb-36 space-y-4 sm:space-y-8 animate-fade-in">
        {showChangePassword ? (
          <ChangePasswordScreen
            onBack={() => setShowChangePassword(false)}
            userData={userData}
          />
        ) : (
          <>
            {/* General Settings */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl">
                <CardTitle className="flex items-center space-x-2 text-primary">
                  <Settings className="w-5 h-5" />
                  <span>Configurações Gerais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-surface-variant/50">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      Ativar BOT
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-body">
                      Controla todo o sistema de respostas automáticas
                    </p>
                  </div>
                  <Switch
                    checked={state.botActive}
                    onCheckedChange={(checked) =>
                      setState((prev) => ({ ...prev, botActive: checked }))
                    }
                  />
                </div>

                <MaterialInput
                  label="Nome da Empresa"
                  helperText="Digite o nome da sua empresa"
                  value={state.companyName}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  disabled={!state.botActive}
                />
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className="shadow-elevation-3">
              <CardHeader className="bg-gradient-to-r from-secondary/10 to-transparent rounded-t-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center space-x-2 text-secondary">
                    <MessageSquare className="w-5 h-5" />
                    <span>Perguntas e Respostas</span>
                  </CardTitle>
                  {/* Plan Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                    currentPlan === "enterprise"
                      ? "bg-purple-500/15 border-purple-500/40"
                      : currentPlan === "premium"
                      ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30"
                      : "bg-muted/50 border-border"
                  }`}>
                    {currentPlan === "enterprise" ? (
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    ) : currentPlan === "premium" ? (
                      <Crown className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Star className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`text-xs font-semibold ${
                      currentPlan === "enterprise"
                        ? "text-purple-700"
                        : currentPlan === "premium"
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}>
                      Plano {PLAN_LABELS[currentPlan]} - {maxFaqs} Perguntas
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por pergunta ou resposta..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full h-10 pl-10 pr-9 rounded-lg border-2 border-border bg-surface text-surface-foreground text-sm transition-all focus:border-primary focus:outline-none"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setMediaFilter(!mediaFilter)}
                    className={`flex items-center gap-2 px-4 h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                      mediaFilter
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Image className="w-4 h-4" />
                    <span>Mídia</span>
                  </button>
                </div>

                {(() => {
                  const hasFilter = searchFilter.trim() !== "" || mediaFilter;
                  const filteredFaqs = state.faqs.filter((faq) => {
                    const searchLower = searchFilter.toLowerCase();
                    const matchesSearch = !searchFilter ||
                      faq.question.toLowerCase().includes(searchLower) ||
                      faq.response.toLowerCase().includes(searchLower);
                    const matchesMedia = !mediaFilter || (faq.url && faq.url.trim() !== "");
                    return matchesSearch && matchesMedia;
                  });

                  return (
                    <>
                      {hasFilter && (
                        <p className="text-xs text-muted-foreground mb-4 font-body">
                          Exibindo {filteredFaqs.length} de {state.faqs.length} perguntas
                        </p>
                      )}
                      <TooltipProvider>
                        <div className="space-y-4 sm:space-y-6">
                          {filteredFaqs.length === 0 && hasFilter ? (
                            <p className="text-center text-sm text-muted-foreground py-8">
                              Nenhuma pergunta encontrada para essa busca.
                            </p>
                          ) : (
                            filteredFaqs.map((faq, index) => {
                              // When filter is active, show all matching results
                              if (!hasFilter) {
                                const originalIndex = state.faqs.findIndex(f => f.id === faq.id);
                                const previousFaq = originalIndex > 0 ? state.faqs[originalIndex - 1] : null;
                                const isPreviousFilled =
                                  !previousFaq ||
                                  (previousFaq.question.trim() !== "" &&
                                    previousFaq.response.trim() !== "");
                                const shouldShow = originalIndex === 0 || isPreviousFilled;
                                if (!shouldShow) return null;
                              }

                              const isOdd = faq.id % 2 === 1;

                              return (
                                <Card
                                  key={faq.id}
                                  className={`shadow-elevation-2 transition-all duration-300 ${
                                    isOdd ? "faq-odd" : "faq-even"
                                  } ${faq.active ? "ring-2 ring-primary/30" : ""}`}
                                >
                                  <CardHeader
                                    className={`${
                                      isOdd ? "faq-header-odd" : "faq-header-even"
                                    } rounded-t-2xl pb-3`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-display font-semibold text-foreground">
                                        Pergunta {faq.id}
                                      </h3>
                                      <Switch
                                        checked={faq.active}
                                        onCheckedChange={(checked) => {
                                          updateFAQ(faq.id, "active", checked);
                                          if (!checked) {
                                            updateFAQ(faq.id, "question", "");
                                            updateFAQ(faq.id, "response", "");
                                            updateFAQ(faq.id, "url", "");
                                          }
                                        }}
                                        disabled={!state.botActive}
                                      />
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-4 pt-4">
                                    <MaterialInput
                                      label="Pergunta"
                                      helperText="Digite a pergunta que o cliente pode fazer"
                                      value={faq.question}
                                      onChange={(e) =>
                                        updateFAQ(faq.id, "question", e.target.value)
                                      }
                                      disabled={!state.botActive || !faq.active}
                                    />
                                    <MaterialTextarea
                                      label="Resposta"
                                      helperText="Digite a resposta que será enviada automaticamente"
                                      value={faq.response}
                                      onChange={(e) =>
                                        updateFAQ(faq.id, "response", e.target.value)
                                      }
                                      disabled={!state.botActive || !faq.active}
                                    />
                                    <FileUploader
                                      value={faq.url}
                                      onChange={(url) => updateFAQ(faq.id, "url", url)}
                                      disabled={!state.botActive || !faq.active}
                                      userLogin={userData?.login || "user"}
                                      questionNumber={faq.id}
                                    />
                                  </CardContent>
                                </Card>
                              );
                            })
                          )}
                        </div>
                      </TooltipProvider>
                    </>
                  );
                })()}
              </CardContent>
            </Card>


            {/* Footer */}
            <div className="text-center pt-6 sm:pt-8 pb-4 text-xs text-muted-foreground border-t border-border mt-6 sm:mt-8 font-body">
              MaisTempo.ai - 2025 - ® Todos os direitos reservados.
            </div>
          </>
        )}
      </main>

      {/* Sticky bottom action bar (only on Perguntas screen) */}
      {!showChangePassword && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-elevation-4">
          <div
            className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportFAQs}
              title="Exportar Perguntas e Respostas"
              aria-label="Exportar Perguntas e Respostas"
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button asChild variant="outline" size="lg" className="flex items-center gap-2 touch-target">
              <a
                href="https://www.maistempoai.com.br/faq"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-5 h-5" />
                Tutorial de Configuração
              </a>
            </Button>
            <Button
              variant="gradient"
              size="lg"
              className="px-8 touch-target"
              onClick={handleSaveConfigurations}
              disabled={saving}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

