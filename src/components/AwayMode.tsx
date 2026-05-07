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
  Moon,
  HelpCircle,
  Image,
  Music,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_BUCKET_URL =
  "https://wueuppkkmpedalxtjouy.supabase.co/storage/v1/object/public/rapi10";

interface AwayModeProps {
  awayModeActive: boolean;
  awayModeMessage: string;
  awayModeMediaUrl: string;
  onUpdate: (updates: any) => void;
  userData?: any;
}

type FileType = "image" | "audio" | "pdf";

export const AwayMode: React.FC<AwayModeProps> = ({
  awayModeActive,
  awayModeMessage,
  awayModeMediaUrl,
  onUpdate,
  userData,
}) => {
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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
      const newFileName = `${sanitizedLogin}_ausente_${timestamp}.${ext}`;

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
      onUpdate({ awayModeMediaUrl: fullUrl });
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error(
        `Erro ao enviar arquivo: ${error?.message || "Erro desconhecido"}`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = async () => {
    if (!awayModeMediaUrl) return;

    const fileNameToDelete = getFileNameFromUrl(awayModeMediaUrl);

    if (fileNameToDelete && awayModeMediaUrl.includes(STORAGE_BUCKET_URL)) {
      try {
        await supabase.storage.from("rapi10").remove([fileNameToDelete]);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }

    onUpdate({ awayModeMediaUrl: "" });
  };

  const fileType = getFileTypeFromUrl(awayModeMediaUrl);
  const fileName = getFileNameFromUrl(awayModeMediaUrl);

  return (
    <Card className="shadow-elevation-3 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#3F5E96]/15 via-[#3F5E96]/10 to-transparent rounded-t-2xl">
        <CardTitle className="flex items-center justify-between text-[#3F5E96]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#3F5E96]/10 flex items-center justify-center">
              <Moon className="w-4 h-4 text-[#3F5E96]" />
            </div>
            <span className="text-lg font-semibold">Modo Ausente</span>
          </div>
          <Switch
            checked={awayModeActive}
            onCheckedChange={(checked) => onUpdate({ awayModeActive: checked })}
          />
        </CardTitle>
      </CardHeader>

      {awayModeActive && (
        <TooltipProvider>
          <CardContent className="space-y-4 pt-4 sm:pt-6 animate-fade-in">
            <p className="text-sm text-muted-foreground font-body">
              Quando ativado, esta mensagem será enviada automaticamente para
              todos os contatos.
            </p>

            <MaterialTextarea
              label="Mensagem de Ausência"
              helperText="Digite a mensagem que será enviada quando estiver ausente"
              value={awayModeMessage}
              onChange={(e) => onUpdate({ awayModeMessage: e.target.value })}
            />

            {/* File Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-display font-semibold text-foreground">
                  Anexar Mídia
                </span>
                <span className="text-xs text-muted-foreground">(opcional)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-primary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      MÍDIAS ACEITAS: imagem = .jpg, áudio = .ogg, catálogo =
                      .pdf
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
              {!awayModeMediaUrl && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
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
                    disabled={uploading}
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
                    disabled={uploading}
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
              {awayModeMediaUrl && fileType && (
                <div className="mt-3 p-3 bg-surface-variant rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    {fileType === "image" && (
                      <div className="relative">
                        <img
                          src={awayModeMediaUrl}
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
                      onClick={handleRemoveMedia}
                      disabled={uploading}
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
          </CardContent>
        </TooltipProvider>
      )}
    </Card>
  );
};
