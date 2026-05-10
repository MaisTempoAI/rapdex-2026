import React, { useState } from "react";
import { LoginPage } from "@/components/LoginPage";
import { Dashboard } from "@/components/Dashboard";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Faq } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Mantém a interface que Dashboard.tsx espera (campo legado mapeado do novo schema)
export interface UserData {
  id: number;
  login: string;
  quepasakey: string;          // client_session
  nomeEmpresa: string;         // nome_empresa
  botativo: boolean;           // bot_ativo
  MSGSaudacaoactive: boolean;  // saudacao_ativa
  MSGSaudacao: string;         // saudacao_texto
  MSGSaudacaourl: string;      // saudacao_url
  MSGSaudacaolink: string;     // saudacao_link
  delayresponse: number;       // delay_resposta
  notificanumero: boolean;     // notifica_ativo
  whatsapp2: string;           // notifica_numero
  MODOausente: boolean;        // ausente_ativo
  MODOausenteMSG: string;      // ausente_texto
  MODOausenteurl: string;      // ausente_url
  plano: string | null;
  exemplosregras: string;      // ia_regras
  exemplosclass: string;       // ia_classificacao
  conta_ativa: boolean;
  em_trial: boolean;
  trial_fim: string;
  // FAQs achatadas: q1-q20, q1response-q20response, q1url-q20url
  [key: string]: unknown;
}

function mapToUserData(acc: Account, faqs: Faq[]): UserData {
  const flat: Record<string, string> = {};
  faqs.forEach((f) => {
    flat[`q${f.slot}`]          = f.pergunta   ?? "";
    flat[`q${f.slot}response`]  = f.resposta   ?? "";
    flat[`q${f.slot}url`]       = f.midia_url  ?? "";
  });

  return {
    id:               acc.id,
    login:            acc.login,
    quepasakey:       acc.client_session ?? "",
    nomeEmpresa:      acc.nome_empresa   ?? "",
    botativo:         acc.bot_ativo,
    MSGSaudacaoactive:acc.saudacao_ativa,
    MSGSaudacao:      acc.saudacao_texto ?? "",
    MSGSaudacaourl:   acc.saudacao_url   ?? "",
    MSGSaudacaolink:  acc.saudacao_link  ?? "",
    delayresponse:    acc.delay_resposta,
    notificanumero:   acc.notifica_ativo,
    whatsapp2:        acc.notifica_numero ?? "",
    MODOausente:      acc.ausente_ativo,
    MODOausenteMSG:   acc.ausente_texto  ?? "",
    MODOausenteurl:   acc.ausente_url    ?? "",
    plano:            acc.plano,
    exemplosregras:   acc.ia_regras      ?? "",
    exemplosclass:    acc.ia_classificacao ?? "",
    conta_ativa:      acc.conta_ativa,
    em_trial:         acc.em_trial,
    trial_fim:        acc.trial_fim,
    ...flat,
  };
}

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (credentials: { login: string; password: string }) => {
    setLoading(true);
    let completed = false;
    const timeout = setTimeout(() => {
      if (!completed) {
        setLoading(false);
        toast.error("Tempo esgotado ao autenticar. Verifique sua conexão e tente novamente.");
      }
    }, 12000);

    try {
      // 1. Valida credenciais via RPC segura
      const { data: authResult, error: authError } = await supabase
        .rpc("validate_login", {
          p_login:    credentials.login,
          p_password: credentials.password,
        });

      if (authError) {
        toast.error("Erro ao autenticar. Tente novamente.");
        return;
      }

      const auth = authResult as { ok: boolean; error?: string };

      if (!auth.ok) {
        const msg =
          auth.error === "trial_expirado"
            ? "Seu período de teste encerrou. Entre em contato para assinar o plano."
            : auth.error === "conta_inativa"
            ? "Sua conta está inativa. Entre em contato com o suporte."
            : "Login ou senha incorretos";
        toast.error(msg, { duration: 6000 });
        return;
      }

      // 2. validate_login já retorna account + FAQs — sem SELECT direto nas tabelas
      const full = authResult as { ok: boolean; error?: string; account?: Account; faqs?: Faq[] };
      setUserData(mapToUserData(full.account as Account, (full.faqs ?? []) as Faq[]));
      setIsAuthenticated(true);
      toast.success("Login realizado com sucesso!");
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      completed = true;
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUserData(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={handleLogin}
        loading={loading}
        onNewRegister={() => navigate("/novo")}
      />
    );
  }

  return <Dashboard onLogout={handleLogout} userData={userData} />;
};

export default Index;
