import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Image, Music, FileText, X, Loader2, Mic, Square, Send, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET_NAME = 'rapdex-midia';
const STORAGE_BUCKET_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;
const MAX_IMAGES = 3;

type FileType = "image" | "audio" | "pdf";

interface FileUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  userLogin: string;
  questionNumber: number;
}

const parseUrls = (value: string): string[] =>
  (value || "").split(";").map((u) => u.trim()).filter(Boolean);

const joinUrls = (urls: string[]): string => urls.join(";");

const getFileTypeFromUrl = (url: string): FileType | null => {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image";
  if (lower.endsWith(".ogg") || lower.endsWith(".webm")) return "audio";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
};

const getFileNameFromUrl = (url: string): string => {
  if (!url) return "";
  const parts = url.split("/");
  return parts[parts.length - 1] || "";
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  value,
  onChange,
  disabled = false,
  userLogin,
  questionNumber,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [audioPreviewOpen, setAudioPreviewOpen] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const opusChunksRef = useRef<Uint8Array[]>([]);
  const nativeChunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<any>(null);
  const nativeRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isOpusRef = useRef(false);

  const urls = parseUrls(value);
  const fieldType: FileType | null = urls.length > 0 ? getFileTypeFromUrl(urls[0]) : null;
  const isImageField = fieldType === "image";
  const isAudioField = fieldType === "audio";
  const isPdfField = fieldType === "pdf";
  const imageCount = isImageField ? urls.length : 0;
  const canAddImage = !fieldType || (isImageField && imageCount < MAX_IMAGES);
  const canAddAudioOrPdf = !fieldType;

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleUpload = async (file: File, type: FileType) => {
    if (!file) return;

    // Validate slot availability
    if (type === "image") {
      if (isAudioField || isPdfField) {
        toast.error("Remova o arquivo atual antes de adicionar imagens.");
        return;
      }
      if (imageCount >= MAX_IMAGES) {
        toast.error(`Máximo de ${MAX_IMAGES} imagens por pergunta.`);
        return;
      }
    } else {
      // audio or pdf must replace and only when empty
      if (fieldType) {
        toast.error("Remova a mídia atual antes de enviar outra.");
        return;
      }
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions: Record<FileType, string[]> = {
      image: ["jpg", "jpeg"],
      audio: ["ogg", "webm"],
      pdf: ["pdf"],
    };

    if (!ext || !validExtensions[type].includes(ext)) {
      toast.error(`Arquivo inválido. Extensões aceitas: ${validExtensions[type].join(", ")}`);
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const sanitizedLogin = userLogin.replace(/[^a-zA-Z0-9]/g, "_");
      const newFileName = `${sanitizedLogin}_q${questionNumber}_${timestamp}.${ext}`;

      const uploadOptions: { cacheControl: string; upsert: boolean; contentType?: string } = {
        cacheControl: "3600",
        upsert: false,
      };
      if (type === "audio") {
        uploadOptions.contentType = ext === "ogg" ? "audio/ogg" : "audio/webm";
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(newFileName, file, uploadOptions);

      if (uploadError) {
        toast.error(`Erro no upload: ${uploadError.message}`);
        return;
      }

      const fullUrl = `${STORAGE_BUCKET_URL}/${newFileName}`;

      if (type === "image") {
        const next = isImageField ? [...urls, fullUrl] : [fullUrl];
        onChange(joinUrls(next));
      } else {
        onChange(fullUrl);
      }
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao enviar arquivo: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAt = async (index: number) => {
    const target = urls[index];
    if (!target) return;
    const fileNameToDelete = getFileNameFromUrl(target);
    if (fileNameToDelete && target.includes(STORAGE_BUCKET_URL)) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([fileNameToDelete]);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
    const next = urls.filter((_, i) => i !== index);
    onChange(next.length > 0 ? joinUrls(next) : "");
  };

  const handleRemoveAll = async () => {
    for (const u of urls) {
      const fileNameToDelete = getFileNameFromUrl(u);
      if (fileNameToDelete && u.includes(STORAGE_BUCKET_URL)) {
        try {
          await supabase.storage.from(BUCKET_NAME).remove([fileNameToDelete]);
        } catch (error) {
          console.error("Error deleting file:", error);
        }
      }
    }
    onChange("");
  };

  const startRecording = useCallback(async () => {
    try {
      // Try opus-recorder first (produces native OGG/Opus)
      try {
        const [{ default: Recorder }, { default: workerUrl }] = await Promise.all([
          import('opus-recorder'),
          import('opus-recorder/dist/encoderWorker.min.js?url'),
        ]);

        const recorder = new Recorder({
          encoderPath: workerUrl,
          encoderApplication: 2049,
          encoderSampleRate: 48000,
          encoderBitRate: 48000,
          streamPages: true,
          numberOfChannels: 1,
        });

        opusChunksRef.current = [];
        isOpusRef.current = true;

        recorder.ondataavailable = (data: Uint8Array) => {
          opusChunksRef.current.push(data);
        };

        recorder.onstop = () => {
          const blob = new Blob(opusChunksRef.current as unknown as BlobPart[], { type: 'audio/ogg; codecs=opus' });
          if (blob.size < 100) {
            toast.error("Gravação muito curta ou vazia.");
            return;
          }
          const url = URL.createObjectURL(blob);
          setFinalBlob(blob);
          setAudioPreviewUrl(url);
          setIsRecording(false);
        };

        await recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
        setRecordingTime(0);
        setAudioPreviewUrl(null);
        setFinalBlob(null);
        return;
      } catch (opusErr) {
        console.warn("opus-recorder failed, falling back to native MediaRecorder:", opusErr);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm; codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      nativeChunksRef.current = [];
      isOpusRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) nativeChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(nativeChunksRef.current, { type: recorder.mimeType });
        if (blob.size < 100) {
          toast.error("Gravação muito curta ou vazia.");
          return;
        }
        const url = URL.createObjectURL(blob);
        setFinalBlob(blob);
        setAudioPreviewUrl(url);
        setIsRecording(false);
      };

      recorder.start(1000);
      nativeRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      setAudioPreviewUrl(null);
      setFinalBlob(null);
    } catch (err: any) {
      console.error("Microphone error:", err);
      toast.error("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (isOpusRef.current && recorderRef.current) {
      recorderRef.current.stop();
    } else if (nativeRecorderRef.current && nativeRecorderRef.current.state !== "inactive") {
      nativeRecorderRef.current.stop();
    }
  }, []);

  const handleSendRecording = useCallback(async () => {
    if (!finalBlob) return;

    const isOgg = finalBlob.type.includes('ogg');
    const ext = isOgg ? 'ogg' : 'webm';
    const file = new File([finalBlob], `recording_${Date.now()}.${ext}`, { type: finalBlob.type });

    setRecordingOpen(false);
    resetRecordingState();
    await handleUpload(file, "audio");
  }, [finalBlob, fieldType]);

  const resetRecordingState = () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setFinalBlob(null);
    opusChunksRef.current = [];
    nativeChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    recorderRef.current = null;
    nativeRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleCancelRecording = () => {
    if (isOpusRef.current && recorderRef.current) {
      try { recorderRef.current.stop(); } catch (_) {}
    } else if (nativeRecorderRef.current && nativeRecorderRef.current.state !== "inactive") {
      nativeRecorderRef.current.stop();
    }
    resetRecordingState();
    setRecordingOpen(false);
  };

  const renderImageThumbs = () => (
    <div className="mt-3 p-3 bg-surface-container rounded-lg border border-border">
      <div className="flex flex-wrap items-start gap-3">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group">
            <img
              src={url}
              alt={`Imagem ${i + 1}`}
              className="h-16 w-16 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setPreviewIndex(i)}
              onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
            />
            <button
              type="button"
              aria-label={`Remover imagem ${i + 1}`}
              onClick={() => handleRemoveAt(i)}
              disabled={disabled || uploading}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:scale-110 transition-transform disabled:opacity-50"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {imageCount < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || uploading}
            className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-surface-foreground/60 hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
            aria-label="Adicionar imagem"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">{imageCount}/{MAX_IMAGES}</span>
          </button>
        )}
      </div>
      <p className="text-xs text-surface-foreground/60 mt-2">
        {imageCount} {imageCount === 1 ? "imagem" : "imagens"} (máx. {MAX_IMAGES})
      </p>
    </div>
  );

  const renderSingleAudioOrPdf = () => {
    const url = urls[0];
    if (!url) return null;
    const fname = getFileNameFromUrl(url);
    return (
      <div className="mt-3 p-3 bg-surface-container rounded-lg border border-border">
        <div className="flex items-center gap-3">
          {isAudioField && (
            <div
              className="flex items-center justify-center h-16 w-16 rounded-lg bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => setAudioPreviewOpen(true)}
            >
              <Music className="w-8 h-8 text-primary" />
            </div>
          )}
          {isPdfField && (
            <div
              className="flex items-center justify-center h-16 w-16 rounded-lg bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => window.open(url, "_blank")}
            >
              <FileText className="w-8 h-8 text-secondary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-foreground truncate">{fname}</p>
            <p className="text-xs text-surface-foreground/60 uppercase">
              {isAudioField ? `Áudio ${url.toLowerCase().endsWith('.webm') ? 'WEBM' : 'OGG'}` : "Catálogo PDF"}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveAll}
            disabled={disabled || uploading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderImageLightbox = () => {
    if (previewIndex === null) return null;
    const url = urls[previewIndex];
    if (!url) return null;
    return (
      <Dialog open={previewIndex !== null} onOpenChange={(open) => { if (!open) setPreviewIndex(null); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/90 border-none">
          <DialogTitle className="sr-only">Preview imagem {previewIndex + 1}</DialogTitle>
          <img
            src={url}
            alt={`Preview ${previewIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain mx-auto rounded"
          />
        </DialogContent>
      </Dialog>
    );
  };

  const renderAudioDialog = () => {
    if (!isAudioField) return null;
    const url = urls[0];
    return (
      <Dialog open={audioPreviewOpen} onOpenChange={setAudioPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Reproduzir Áudio</DialogTitle>
          <div className="py-4">
            <audio controls autoPlay className="w-full" src={url} />
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderRecordingDialog = () => (
    <Dialog open={recordingOpen} onOpenChange={(open) => { if (!open) handleCancelRecording(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gravar Áudio</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-3xl font-mono text-foreground tabular-nums">
            {formatTime(recordingTime)}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              Gravando...
            </div>
          )}

          {!audioPreviewUrl ? (
            <div className="flex gap-3">
              {!isRecording ? (
                <Button variant="default" onClick={startRecording} className="gap-2">
                  <Mic className="w-4 h-4" />
                  Gravar
                </Button>
              ) : (
                <Button variant="error" onClick={stopRecording} className="gap-2">
                  <Square className="w-4 h-4" />
                  Parar
                </Button>
              )}
            </div>
          ) : (
            <>
              <audio controls className="w-full" src={audioPreviewUrl} />
              <DialogFooter className="flex w-full gap-2 sm:justify-center">
                <Button variant="outline" onClick={handleCancelRecording}>
                  Cancelar
                </Button>
                <Button variant="default" onClick={handleSendRecording} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-surface-foreground">Anexar Mídia</span>
        <span className="text-xs text-surface-foreground/60">
          (até {MAX_IMAGES} imagens OU 1 áudio OU 1 catálogo)
        </span>
      </div>

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept=".jpg,.jpeg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "image"); e.target.value = ""; }} />
      <input ref={audioInputRef} type="file" accept=".ogg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "audio"); e.target.value = ""; }} />
      <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "pdf"); e.target.value = ""; }} />

      {/* Upload buttons: only when field is empty (audio/pdf require empty; image has its own + tile in grid) */}
      {!fieldType && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm"
            onClick={() => imageInputRef.current?.click()} disabled={disabled || uploading} className="flex items-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
            <span>Imagem</span>
            <span className="text-xs opacity-60">.jpg ×{MAX_IMAGES}</span>
          </Button>

          <Button type="button" variant="outline" size="sm"
            onClick={() => pdfInputRef.current?.click()} disabled={disabled || uploading} className="flex items-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Catálogo</span>
            <span className="text-xs opacity-60">.pdf</span>
          </Button>

          <Button type="button" variant="outline" size="sm"
            onClick={() => audioInputRef.current?.click()} disabled={disabled || uploading} className="flex items-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
            <span>Áudio</span>
            <span className="text-xs opacity-60">.ogg</span>
          </Button>

          <Button type="button" variant="outline" size="sm"
            onClick={() => setRecordingOpen(true)} disabled={disabled || uploading} className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span>Gravar</span>
          </Button>
        </div>
      )}

      {isImageField && renderImageThumbs()}
      {(isAudioField || isPdfField) && renderSingleAudioOrPdf()}

      {renderImageLightbox()}
      {renderAudioDialog()}
      {renderRecordingDialog()}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Enviando arquivo...</span>
        </div>
      )}
    </div>
  );
};
