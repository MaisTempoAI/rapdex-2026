export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PlanType   = 'basic' | 'premium';
export type MediaType  = 'imagem' | 'audio' | 'pdf';
export type SlotStatus = 'disponivel' | 'ocupado' | 'manutencao';
export type SlotTipo   = 'free' | 'premium';

export interface Database {
  public: {
    Tables: {
      rapdex_accounts: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          login: string;
          quepasakey: string;
          newpassword: string | null;
          nome_empresa: string | null;
          plano: PlanType;
          whatsapp: string | null;
          client_session: string | null;
          bot_ativo: boolean;
          delay_resposta: number;
          saudacao_ativa: boolean;
          saudacao_texto: string | null;
          saudacao_url: string | null;
          saudacao_link: string | null;
          ausente_ativo: boolean;
          ausente_texto: string | null;
          ausente_url: string | null;
          notifica_ativo: boolean;
          notifica_numero: string | null;
          ia_regras: string | null;
          ia_classificacao: string | null;
          conta_ativa: boolean;
          em_trial: boolean;
          trial_inicio: string;
          trial_fim: string;
        };
        Insert: {
          login: string;
          quepasakey: string;
          newpassword?: string | null;
          nome_empresa?: string | null;
          plano?: PlanType;
          whatsapp?: string | null;
          client_session?: string | null;
          bot_ativo?: boolean;
          delay_resposta?: number;
          saudacao_ativa?: boolean;
          saudacao_texto?: string | null;
          saudacao_url?: string | null;
          saudacao_link?: string | null;
          ausente_ativo?: boolean;
          ausente_texto?: string | null;
          ausente_url?: string | null;
          notifica_ativo?: boolean;
          notifica_numero?: string | null;
          ia_regras?: string | null;
          ia_classificacao?: string | null;
          conta_ativa?: boolean;
          em_trial?: boolean;
          trial_inicio?: string;
          trial_fim?: string;
        };
        Update: Partial<Database['public']['Tables']['rapdex_accounts']['Insert']>;
      };

      rapdex_faqs: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          login: string;
          slot: number;
          ativa: boolean;
          pergunta: string | null;
          resposta: string | null;
          midia_url: string | null;
          midia_tipo: MediaType | null;
        };
        Insert: {
          login: string;
          slot: number;
          ativa?: boolean;
          pergunta?: string | null;
          resposta?: string | null;
          midia_url?: string | null;
          midia_tipo?: MediaType | null;
        };
        Update: Partial<Database['public']['Tables']['rapdex_faqs']['Insert']>;
      };

      rapdex_leads: {
        Row: {
          id: number;
          created_at: string;
          login: string;
          whatsapp_cli: string;
          nome: string | null;
          bot_ativo: boolean;
          ultima_mensagem: string | null;
        };
        Insert: {
          login: string;
          whatsapp_cli: string;
          nome?: string | null;
          bot_ativo?: boolean;
          ultima_mensagem?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rapdex_leads']['Insert']>;
      };

      rapdex_slots: {
        Row: {
          id: number;
          created_at: string;
          updated_at: string;
          slot_nome: string;
          tipo: SlotTipo;
          status: SlotStatus;
          quepasa_key: string;
          quepasa_wid: string | null;
          quepasa_base_url: string;
          webhook_mensagem: string;
          workflow_url: string | null;
          slot_notas: string | null;
          login: string | null;
          alocado_em: string | null;
          liberado_em: string | null;
        };
        Insert: {
          slot_nome: string;
          tipo?: SlotTipo;
          status?: SlotStatus;
          quepasa_key: string;
          quepasa_wid?: string | null;
          quepasa_base_url?: string;
          webhook_mensagem: string;
          workflow_url?: string | null;
          slot_notas?: string | null;
          login?: string | null;
          alocado_em?: string | null;
          liberado_em?: string | null;
        };
        Update: Partial<Database['public']['Tables']['rapdex_slots']['Insert']>;
      };

      rapdex_conversations: {
        Row: {
          id: number;
          created_at: string;
          login: string;
          lead_id: number | null;
          whatsapp_cli: string;
          mensagem: string | null;
          resposta: string | null;
          de_mim: boolean;
        };
        Insert: {
          login: string;
          lead_id?: number | null;
          whatsapp_cli: string;
          mensagem?: string | null;
          resposta?: string | null;
          de_mim?: boolean;
        };
        Update: Partial<Database['public']['Tables']['rapdex_conversations']['Insert']>;
      };
    };

    Views: Record<string, never>;

    Functions: {
      validate_login: {
        Args: { p_login: string; p_password: string };
        Returns: {
          ok: boolean;
          login?: string;
          nome_empresa?: string | null;
          plano?: PlanType;
          bot_ativo?: boolean;
          whatsapp?: string | null;
          client_session?: string | null;
          error?: string;
        };
      };
      create_account: {
        Args: {
          p_login: string;
          p_quepasakey: string;
          p_nome_empresa?: string;
          p_plano?: PlanType;
          p_whatsapp?: string;
        };
        Returns: { ok: boolean; login?: string; error?: string };
      };
      change_password: {
        Args: { p_login: string; p_old: string; p_new: string };
        Returns: { ok: boolean; error?: string };
      };
      forgot_password_lookup: {
        Args: { p_login: string };
        Returns: boolean;
      };
      disable_expired_trials: {
        Args: Record<string, never>;
        Returns: Array<{
          login: string;
          whatsapp: string | null;
          nome_empresa: string | null;
          trial_inicio: string;
          trial_fim: string;
        }>;
      };
      get_usage_report: {
        Args: { p_login: string; p_desde: string };
        Returns: {
          login: string;
          nome_empresa: string | null;
          periodo_inicio: string;
          periodo_fim: string;
          leads_novos: number;
          leads_ativos: number;
          msgs_total: number;
          msgs_bot: number;
          msgs_cliente: number;
          faqs_ativas: number;
          taxa_resposta: number;
        };
      };
      activate_account: {
        Args: { p_login: string; p_plano?: PlanType };
        Returns: { ok: boolean; login?: string; plano?: PlanType; error?: string };
      };
    };

    Enums: {
      plano_tipo:   PlanType;
      slot_status:  SlotStatus;
      slot_tipo:    SlotTipo;
    };
  };
}

// Tipos utilitários usados nos componentes
export type Account      = Database['public']['Tables']['rapdex_accounts']['Row'];
export type Faq          = Database['public']['Tables']['rapdex_faqs']['Row'];
export type Lead         = Database['public']['Tables']['rapdex_leads']['Row'];
export type Conversation = Database['public']['Tables']['rapdex_conversations']['Row'];
export type Slot         = Database['public']['Tables']['rapdex_slots']['Row'];
export type UsageReport  = Database['public']['Functions']['get_usage_report']['Returns'];
