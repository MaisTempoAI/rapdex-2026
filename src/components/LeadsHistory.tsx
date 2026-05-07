import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MaterialInput } from "@/components/MaterialInput";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Phone, Clock, MessageCircle, ArrowLeft, 
  LayoutDashboard, Bot, Users, Eye, UserX, RotateCcw 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
interface Lead {
  id: string;
  phone: string;
  name: string;
  lastMessage: string;
  botResponse: string;
  timestamp: string;
  unread?: boolean;
  messages: Message[];
}

interface Message {
  id: string;
  text: string;
  sender: "client" | "our_client";
  timestamp: string;
  fromme: boolean | null;
}

interface LeadsHistoryProps {
  userData?: {
    login: string;
    quepasakey: string;
  };
}

const cleanPhone = (phone: string) => phone.replace(/@s\.whatsapp\.net/gi, '');

export const LeadsHistory: React.FC<LeadsHistoryProps> = ({ userData }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabledClients, setDisabledClients] = useState<any[]>([]);
  const [loadingDisabled, setLoadingDisabled] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);

  useEffect(() => {
    if (userData?.login) {
      loadConversations();
    }
  }, [userData?.login]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      console.log("Loading conversations for user:", userData?.login);
      
      const { data, error } = await supabase
        .from("FAQ10-conversation" as any)
        .select("*")
        .eq("login", userData?.login)
        .order("id", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Erro ao carregar conversas: ${error.message}`);
        return;
      }

      console.log("Conversations loaded:", data?.length || 0, "records");

      if (!data || data.length === 0) {
        setLeads([]);
        setLoading(false);
        return;
      }

      const clientGroups: { [key: string]: any[] } = {};
      data.forEach((conv: any) => {
        const clientKey = conv.whatsappcli || "unknown";
        if (!clientGroups[clientKey]) {
          clientGroups[clientKey] = [];
        }
        clientGroups[clientKey].push(conv);
      });

      const leadsData: Lead[] = Object.entries(clientGroups).map(
        ([clientKey, conversations]) => {
          const lastConv = conversations[0];
          const phone = clientKey;
          const name = lastConv.idclient || `Cliente ${clientKey.slice(-4)}`;

          const messages: Message[] = conversations
            .map((conv: any) => {
              const msgs: Message[] = [];

              if (conv.pergunta) {
                msgs.push({
                  id: `${conv.id}-q`,
                  text: conv.pergunta,
                  sender: "client",
                  timestamp: formatTime(conv.criadoem),
                  fromme: conv.fromme === true,
                });
              }

              if (conv.resposta) {
                msgs.push({
                  id: `${conv.id}-r`,
                  text: conv.resposta,
                  sender: "our_client",
                  timestamp: formatTime(conv.criadoem),
                  fromme: conv.fromme === true,
                });
              }

              return msgs;
            })
            .flat();

          return {
            id: clientKey,
            name,
            phone,
            lastMessage: lastConv.pergunta || "",
            botResponse: lastConv.resposta || "",
            timestamp: formatTime(lastConv.criadoem),
            unread: false,
            messages,
          };
        }
      );

      setLeads(leadsData);
    } catch (error) {
      console.error("Unexpected error loading conversations:", error);
      toast.error("Erro inesperado ao carregar conversas");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      if (dateString.includes("|")) {
        const [datePart, timePart] = dateString.split(" | ");
        const [day, month, year] = datePart.split("/");
        const [hour, minute] = timePart.split(":");
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );
        return date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      const date = new Date(dateString);
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setMessages(lead.messages);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLead || !userData) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "our_client",
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fromme: true,
    };

    setMessages((prev) => [...prev, message]);

    try {
      const webhookData = {
        login: userData.login,
        senha: userData.quepasakey,
        whatsappcli: selectedLead.phone,
        resposta: newMessage,
        idclient: selectedLead.name,
      };

      await fetch(
        "https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/faq10-envios-private",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "no-cors",
          body: JSON.stringify(webhookData),
        }
      );

      toast.success("Mensagem enviada!");
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
      console.error("Webhook error:", error);
    }

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatFullDate = (dateString: string) => {
    try {
      if (dateString.includes("|")) {
        const [datePart, timePart] = dateString.split(" | ");
        return `${datePart} às ${timePart}`;
      }
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const isFalse = (v: any) => v === false || v === "false" || v === 0 || v === "0";

  const loadDisabledClients = async () => {
    if (!userData?.login) return;
    setLoadingDisabled(true);
    try {
      const { data, error } = await supabase
        .from("FAQ10-clients" as any)
        .select("*")
        .eq("login", userData.login);
      if (error) {
        toast.error(`Erro ao carregar desativados: ${error.message}`);
        setDisabledClients([]);
        return;
      }
      const filtered = (data || []).filter((c: any) => isFalse(c.botativo));
      setDisabledClients(filtered);
    } catch (e) {
      console.error(e);
      toast.error("Erro inesperado ao carregar desativados");
    } finally {
      setLoadingDisabled(false);
    }
  };

  const reactivateClient = async (id: any) => {
    if (!userData?.login) return;
    setReactivating(String(id));
    try {
      const { error } = await supabase
        .from("FAQ10-clients" as any)
        .update({ botativo: true } as any)
        .eq("id", id)
        .eq("login", userData.login);
      if (error) {
        toast.error(`Erro ao reativar: ${error.message}`);
        return;
      }
      setDisabledClients((prev) => prev.filter((c: any) => c.id !== id));
      toast.success("Cliente reativado");
    } finally {
      setReactivating(null);
    }
  };

  const reactivateAll = async () => {
    if (!userData?.login || disabledClients.length === 0) return;
    if (!window.confirm(`Reativar todos os ${disabledClients.length} clientes desativados?`)) return;
    try {
      const { error } = await supabase
        .from("FAQ10-clients" as any)
        .update({ botativo: true } as any)
        .eq("login", userData.login)
        .eq("botativo", false);
      if (error) {
        toast.error(`Erro ao reativar todos: ${error.message}`);
        return;
      }
      setDisabledClients([]);
      toast.success("Todos os clientes foram reativados");
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewConversation = (lead: Lead) => {
    setSelectedLead(lead);
    setMessages(lead.messages);
  };

  return (
    <div className="h-[calc(100vh-200px)] sm:h-[calc(100vh-200px)] flex flex-col bg-background rounded-2xl overflow-hidden">
      <Tabs defaultValue="geral" className="flex flex-col h-full" onValueChange={(v) => { if (v === "desativados") loadDisabledClients(); }}>
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <TabsList className="grid w-full grid-cols-3 bg-surface-variant/50">
            <TabsTrigger 
              value="geral" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger 
              value="conversas"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Conversas
            </TabsTrigger>
            <TabsTrigger 
              value="desativados"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-display"
            >
              <UserX className="w-4 h-4 mr-2" />
              Desativados
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Aba GERAL - Dashboard */}
        <TabsContent value="geral" className="flex-1 overflow-hidden m-0">
          <div className="h-full flex flex-col">
            <div className="p-3 sm:p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h3 className="font-display font-semibold text-foreground text-sm">
                      Dashboard de Atendimentos
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-body flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {leads.length} clientes atendidos
                    </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-body">
                    Carregando atendimentos...
                  </p>
                </div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-body">
                    Nenhum atendimento encontrado
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead className="bg-surface-variant/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-display text-xs text-muted-foreground font-medium">Cliente</th>
                          <th className="text-left p-2 font-display text-xs text-muted-foreground font-medium">Última Pergunta</th>
                          <th className="text-left p-2 font-display text-xs text-muted-foreground font-medium">Resposta RAPDEX</th>
                          <th className="text-left p-2 font-display text-xs text-muted-foreground font-medium">Data/Hora</th>
                          <th className="text-center p-2 font-display text-xs text-muted-foreground font-medium">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead, index) => (
                          <tr 
                            key={lead.id} 
                            className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${
                              index % 2 === 0 ? 'bg-surface/30' : 'bg-transparent'
                            }`}
                          >
                            <td className="p-2">
                              <div>
                                <p className="font-display font-medium text-foreground text-xs">{lead.name}</p>
                                <p className="text-[10px] text-muted-foreground font-body flex items-center">
                                  <Phone className="w-2.5 h-2.5 mr-1" />
                                  {cleanPhone(lead.phone)}
                                </p>
                              </div>
                            </td>
                            <td className="p-2">
                              <p className="text-xs text-foreground/80 font-body line-clamp-2 max-w-xs">
                                {lead.lastMessage || "—"}
                              </p>
                            </td>
                            <td className="p-2">
                              <p className="text-xs text-primary font-body line-clamp-2 max-w-xs">
                                {lead.botResponse || "—"}
                              </p>
                            </td>
                            <td className="p-2">
                              <p className="text-[10px] text-muted-foreground font-body flex items-center">
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                {lead.timestamp}
                              </p>
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewConversation(lead)}
                                className="hover:bg-primary/10 hover:text-primary text-xs"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2 p-3">
                    {leads.map((lead) => (
                      <div 
                        key={lead.id}
                        className="bg-card rounded-xl p-3 border border-border shadow-elevation-1"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div>
                              <p className="font-display font-semibold text-foreground text-xs">{lead.name}</p>
                              <p className="text-[10px] text-muted-foreground font-body">{cleanPhone(lead.phone)}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground font-body flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {lead.timestamp}
                          </span>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="bg-surface/50 rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground font-display mb-1">Pergunta:</p>
                            <p className="text-xs text-foreground/80 font-body line-clamp-2">
                              {lead.lastMessage || "—"}
                            </p>
                          </div>
                          <div className="bg-primary/5 rounded-lg p-2 border-l-2 border-primary">
                            <p className="text-[10px] text-muted-foreground font-display mb-1">Resposta RAPDEX:</p>
                            <p className="text-xs text-primary font-body line-clamp-2">
                              {lead.botResponse || "—"}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewConversation(lead)}
                          className="w-full hover:bg-primary/10 hover:text-primary hover:border-primary"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Conversa Completa
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Aba CONVERSAS - Chat detalhado */}
        <TabsContent value="conversas" className="flex-1 overflow-hidden m-0">
          <div className="h-full flex flex-col sm:flex-row">
            {/* Lista de Leads */}
            <div
              className={`${
                selectedLead ? "hidden sm:flex" : "flex"
              } w-full sm:w-1/3 border-r border-border bg-surface-variant/30 flex-col`}
            >
              <div className="p-3 sm:p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
                <h3 className="font-display font-semibold text-foreground text-sm flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span>Conversas ({leads.length})</span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-body">
                      Carregando conversas...
                    </p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="p-4 text-center">
                    <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-body">
                      Nenhuma conversa encontrada
                    </p>
                  </div>
                ) : (
                  leads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`p-3 sm:p-4 border-b border-border cursor-pointer hover:bg-primary/5 transition-all duration-200 ${
                        selectedLead?.id === lead.id
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : ""
                      }`}
                      onClick={() => handleLeadSelect(lead)}
                    >
                      <div className="flex items-start space-x-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-display font-semibold text-foreground truncate text-xs sm:text-sm">
                              {lead.name}
                            </h4>
                            <span className="text-[10px] text-muted-foreground flex items-center font-body">
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {lead.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 mb-1">
                            <Phone className="w-2.5 h-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground font-body">
                              {cleanPhone(lead.phone)}
                            </span>
                          </div>

                          <p className="text-[10px] sm:text-xs text-foreground/80 truncate mb-1 font-body">
                            <span className="font-semibold">Cliente:</span>{" "}
                            {lead.lastMessage}
                          </p>

                          <p className="text-[10px] sm:text-xs text-primary truncate font-body">
                            <span className="font-semibold">RAPDEX:</span>{" "}
                            {lead.botResponse}
                          </p>

                          {lead.unread && (
                            <div className="w-2 h-2 bg-primary rounded-full ml-auto mt-1 animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Área de Conversa */}
            <div
              className={`${
                selectedLead ? "flex" : "hidden sm:flex"
              } flex-1 flex-col`}
            >
              {selectedLead ? (
                <>
                  {/* Header da conversa */}
                  <div className="p-2 sm:p-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="sm:hidden p-1"
                        onClick={() => setSelectedLead(null)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div>
                        <h3 className="font-display font-semibold text-foreground text-xs sm:text-sm">
                          {selectedLead.name}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-body">
                          {cleanPhone(selectedLead.phone)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div
                    className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 bg-surface/50"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.fromme === true || message.sender === "our_client"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-2.5 sm:px-3 py-1.5 rounded-2xl ${
                            message.fromme === true || message.sender === "our_client"
                              ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-bl-md"
                              : "bg-card border border-border text-card-foreground rounded-br-md shadow-elevation-1"
                          }`}
                        >
                          <p className="text-xs font-body">{message.text}</p>
                          <p
                            className={`text-[9px] sm:text-[10px] mt-0.5 ${
                              message.fromme === true ||
                              message.sender === "our_client"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input de nova mensagem */}
                  <div className="p-2 sm:p-3 border-t border-border bg-background">
                    <div className="flex space-x-2">
                      <MaterialInput
                        label=""
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 text-xs"
                      />
                      <Button
                        variant="gradient"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-3 min-h-[40px] touch-target"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-surface/30">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-muted-foreground mb-2">
                      Histórico de Interações
                    </h3>
                    <p className="text-sm text-muted-foreground font-body max-w-xs">
                      Selecione uma conversa para ver o histórico e enviar mensagens
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Aba DESATIVADOS - Clientes com botativo=false */}
        <TabsContent value="desativados" className="flex-1 overflow-hidden m-0">
          <div className="h-full flex flex-col">
            <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-error/80 to-error flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-foreground text-sm truncate">
                    Clientes Desativados
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-body">
                    {disabledClients.length} desativado(s)
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={reactivateAll}
                disabled={disabledClients.length === 0 || loadingDisabled}
                className="shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reativar Todos
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingDisabled ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-body">Carregando...</p>
                </div>
              ) : disabledClients.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                    <UserX className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-body">
                    Nenhum cliente desativado
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {disabledClients.map((c: any) => {
                    const phone = c.whatsappcli || c.whatsapp || c.numero || c.phone || "";
                    const name = c.idclient || c.nome || c.name || `Cliente ${String(phone).slice(-4)}`;
                    return (
                      <div
                        key={c.id}
                        className="bg-card rounded-xl p-3 border border-border shadow-elevation-1 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-foreground text-sm truncate">{name}</p>
                          {phone && (
                            <p className="text-[11px] text-muted-foreground font-body flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {cleanPhone(String(phone))}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          disabled={reactivating === String(c.id)}
                          onClick={() => reactivateClient(c.id)}
                          className="shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Reativar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};