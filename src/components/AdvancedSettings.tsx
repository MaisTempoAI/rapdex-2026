import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MaterialTextarea } from "@/components/MaterialTextarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronUp,
  Settings,
  Bell,
  Clock,
  HelpCircle,
  Image,
  Music,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaterialInput } from "@/components/MaterialInput";

const STORAGE_BUCKET_URL =
  "https://wueuppkkmpedalxtjouy.supabase.co/storage/v1/object/public/rapi10";

interface AdvancedSettingsProps {
  botActive: boolean;
  greetingActive: boolean;
  greetingMessage: string;
  greetingMediaUrl: string;
  responseDelay: number;
  notificationActive: boolean;
  notificationPhone: string;
  onUpdate: (updates: any) => void;
  formatPhoneNumber: (value: string) => string;
  userData?: any;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  botActive,
  greetingActive,
  greetingMessage,
  greetingMediaUrl,
  responseDelay,
  notificationActive,
  notificationPhone,
  onUpdate,
  formatPhoneNumber,
  userData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (file: File, type: FileType) => {
    if (!file || !userData?.login) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions: Record<FileType, string[]> = {
      image: ["jpg", "jpeg"],
      audio: ["ogg"],
      pdf: ["pdf"],
    };

    if (!ext || !validExtensions[type].includes(ext)) {
      toast.error(
        `Arquivo inválido. Extensões aceitas: ${validExtensions[type].join(", ")}`
      );
      return;
    }

    setUploading(true);

    try {
      const timestamp = Date.now();
      const sanitizedLogin = userData.login.replace(/[^a-zA-Z0-9]/g, "_");
      const newFileName = `${sanitizedLogin}_greeting_${timestamp}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
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
      onUpdate({ greetingMediaUrl: fullUrl });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error(
        `Erro ao enviar arquivo: ${error?.message || "Erro desconhecido"}`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveGreetingMedia = async () => {
    if (!greetingMediaUrl) return;

    const fileNameToDelete = getFileNameFromUrl(greetingMediaUrl);

    if (fileNameToDelete && greetingMediaUrl.includes(STORAGE_BUCKET_URL)) {
      try {
        await supabase.storage.from("rapi10").remove([fileNameToDelete]);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }

    onUpdate({ greetingMediaUrl: "" });
  };

  const fileType = getFileTypeFromUrl(greetingMediaUrl);
  const fileName = getFileNameFromUrl(greetingMediaUrl);

  return (
    <Card className="shadow-elevation-3">
      <CardHeader
        className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl cursor-pointer hover:from-primary/15 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-primary">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configurações Avançadas</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <TooltipProvider>
          <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 animate-fade-in">
            {/* Mensagem de Saudação */}
            <Card className="border border-primary/20 shadow-elevation-1">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-variant/50">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      Mensagem de Saudação
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-body">
                      Primeira mensagem enviada aos usuários
                    </p>
                  </div>
                  <Switch
                    checked={greetingActive}
                    onCheckedChange={(checked) =>
                      onUpdate({ greetingActive: checked })
                    }
                    disabled={!botActive}
                  />
                </div>
                {greetingActive && (
                  <div className="space-y-4">
                    <MaterialTextarea
                      label="Mensagem de Saudação"
                      helperText="Digite a mensagem que será enviada como saudação"
                      value={greetingMessage}
                      onChange={(e) =>
                        onUpdate({ greetingMessage: e.target.value })
                      }
                      disabled={!botActive}
                    />

                    {/* File Upload Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-display font-semibold text-foreground">
                          Anexar Mídia
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (escolha 1)
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-primary cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              MÍDIAS ACEITAS: imagem = .jpg, áudio = .ogg,
                              catálogo = .pdf
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Hidden file inputs */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept=".jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, "image");
                          e.target.value = "";
                        }}
                      />
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept=".ogg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, "audio");
                          e.target.value = "";
                        }}
                      />
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file, "pdf");
                          e.target.value = "";
                        }}
                      />

                      {/* Upload buttons */}
                      {!greetingMediaUrl && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={!botActive || uploading}
                            className="flex items-center gap-2 touch-target"
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Image className="w-4 h-4" />
                            )}
                            <span>Imagem</span>
                            <span className="text-xs opacity-60">.jpg</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => audioInputRef.current?.click()}
                            disabled={!botActive || uploading}
                            className="flex items-center gap-2 touch-target"
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Music className="w-4 h-4" />
                            )}
                            <span>Áudio</span>
                            <span className="text-xs opacity-60">.ogg</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={!botActive || uploading}
                            className="flex items-center gap-2 touch-target"
                          >
                            {uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            <span>Catálogo</span>
                            <span className="text-xs opacity-60">.pdf</span>
                          </Button>
                        </div>
                      )}

                      {/* Preview */}
                      {greetingMediaUrl && fileType && (
                        <div className="mt-3 p-3 bg-surface-variant rounded-xl border border-border">
                          <div className="flex items-center gap-3">
                            {fileType === "image" && (
                              <div className="relative">
                                <img
                                  src={greetingMediaUrl}
                                  alt="Preview"
                                  className="h-16 w-16 rounded-xl object-cover border border-border"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              </div>
                            )}
                            {fileType === "audio" && (
                              <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-primary/10">
                                <Music className="w-8 h-8 text-primary" />
                              </div>
                            )}
                            {fileType === "pdf" && (
                              <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-secondary/10">
                                <FileText className="w-8 h-8 text-secondary" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-display font-semibold text-foreground truncate">
                                {fileName}
                              </p>
                              <p className="text-xs text-muted-foreground uppercase font-body">
                                {fileType === "image"
                                  ? "Imagem JPG"
                                  : fileType === "audio"
                                    ? "Áudio OGG"
                                    : "Catálogo PDF"}
                              </p>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveGreetingMedia}
                              disabled={!botActive || uploading}
                              className="text-error hover:text-error hover:bg-error/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Uploading state */}
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-primary font-body">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando arquivo...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tempo de Resposta */}
            <Card className="border border-primary/20 shadow-elevation-1">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-display font-semibold text-foreground">
                        Tempo para Resposta
                      </span>
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
                      value={responseDelay}
                      onChange={(e) =>
                        onUpdate({ responseDelay: parseInt(e.target.value) || 3 })
                      }
                      disabled={!botActive}
                      className="w-full sm:w-48"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notificações */}
            <Card className="border border-primary/20 shadow-elevation-1">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-variant/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        Notificações
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-body max-w-xs">
                        Receba notificações para mensagens não cadastradas
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationActive}
                    onCheckedChange={(checked) =>
                      onUpdate({ notificationActive: checked })
                    }
                    disabled={!botActive}
                  />
                </div>

                {notificationActive && (
                  <MaterialInput
                    label="Número WhatsApp para Notificações"
                    helperText="Exemplo: +55 11 99999-9999"
                    value={notificationPhone}
                    onChange={(e) =>
                      onUpdate({
                        notificationPhone: formatPhoneNumber(e.target.value),
                      })
                    }
                    disabled={!botActive}
                  />
                )}
              </CardContent>
            </Card>
          </CardContent>
        </TooltipProvider>
      )}
    </Card>
  );
};