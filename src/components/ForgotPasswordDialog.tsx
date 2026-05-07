import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MaterialInput } from "@/components/MaterialInput";
import { Mail } from "lucide-react";

interface ForgotPasswordDialogProps {
  children: React.ReactNode;
}

export const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({ children }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://n8n-stack-n8n.nzdbvp.easypanel.host/webhook/cb5b9a11-75dc-44ce-be54-d3ce5e2c3229', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          name: name,
          phone: phone,
          timestamp: new Date().toISOString(),
        }),
      });
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error sending webhook:', error);
      setIsSubmitted(true); // Still show success to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    setIsSubmitted(false);
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <Dialog onOpenChange={handleClose}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">Solicitação Enviada</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <p className="text-surface-foreground text-center">
              <strong>MENSAGEM ENVIADA AO SUPORTE!</strong>
            </p>
            <p className="text-sm text-surface-foreground/70 text-center">
              Em breve você receberá uma mensagem do nosso suporte através do WhatsApp.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-primary">Esqueci a Senha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <MaterialInput
            label="Nome Completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
          />
          
          <MaterialInput
            label="Número Cadastrado"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={isSubmitting}
          />
          
          <Button 
            type="submit" 
            variant="filled" 
            className="w-full"
            disabled={isSubmitting || !name || !phone}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Enviar Solicitação
              </>
            )}
          </Button>
          
          <p className="text-xs text-surface-foreground/60 text-center">
            Os dados serão enviados para suporte@maistempoai.com.br
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};