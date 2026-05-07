import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MaterialInput } from "@/components/MaterialInput";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { LogIn, Bot } from "lucide-react";

interface LoginPageProps {
  onLogin: (credentials: { login: string; password: string }) => void;
  loading?: boolean;
  onNewRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  loading: isLoading = false,
  onNewRegister,
}) => {
  const [credentials, setCredentials] = useState({
    login: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(credentials);
  };

  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4 sm:p-6 relative">
      {onNewRegister && (
        <Button
          variant="glass"
          size="sm"
          onClick={onNewRegister}
          className="absolute top-4 right-4 z-10"
        >
          + NOVO CADASTRO
        </Button>
      )}
      <div className="w-full max-w-sm sm:max-w-md animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl mb-4 shadow-glow animate-pulse-glow border border-primary-foreground/20">
            <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-2 tracking-tight">
            RAPDEX
          </h1>
          <p className="font-body text-primary-foreground/70 text-sm sm:text-base">
            Respostas Automáticas Personalizadas
          </p>
        </div>

        {/* Login Card */}
        <Card className="glass shadow-elevation-4 border-0">
          <CardHeader className="text-center pb-2 sm:pb-4 px-4 sm:px-6 pt-6">
            <CardTitle className="font-display text-xl sm:text-2xl text-foreground">
              Faça seu Login
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <MaterialInput
                label="Login"
                type="text"
                value={credentials.login}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    login: e.target.value
                  }))
                }
                required
                disabled={isLoading}
              />

              <MaterialInput
                label="Senha"
                type="password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    password: e.target.value
                  }))
                }
                required
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full touch-target"
                disabled={isLoading || !credentials.login || !credentials.password}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Entrar
                  </>
                )}
              </Button>

              <div className="text-center">
                <ForgotPasswordDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80 font-body"
                  >
                    Esqueci a senha
                  </Button>
                </ForgotPasswordDialog>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 text-xs text-primary-foreground/50 font-body">
          MaisTempo.ai - 2025 - ® Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};