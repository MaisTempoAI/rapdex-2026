import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MaterialInput } from "@/components/MaterialInput";
import { Key, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChangePasswordScreenProps {
  onBack: () => void;
  userData?: any;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  onBack,
  userData,
}) => {
  const [passwordData, setPasswordData] = useState({
    login:           userData?.login ?? "",
    currentPassword: "",
    newPassword:     "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      const { data, error } = await supabase.rpc("change_password", {
        p_login: passwordData.login,
        p_old:   passwordData.currentPassword,
        p_new:   passwordData.newPassword,
      });

      if (error) {
        toast.error("Erro ao alterar senha: " + error.message);
        return;
      }

      const result = data as { ok: boolean; error?: string };

      if (!result.ok) {
        toast.error(
          result.error === "senha_atual_incorreta"
            ? "Senha atual incorreta"
            : result.error ?? "Erro ao alterar senha"
        );
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setPasswordData({
        login:           userData?.login ?? "",
        currentPassword: "",
        newPassword:     "",
      });
      onBack();
    } catch {
      toast.error("Erro ao alterar senha");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <Button
        variant="outline"
        onClick={onBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <Card className="shadow-elevation-3 max-w-md mx-auto">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl">
          <CardTitle className="flex items-center space-x-2 text-primary">
            <Key className="w-5 h-5" />
            <span>Alterar Senha de Acesso</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <MaterialInput
              label="Login"
              type="text"
              value={passwordData.login}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, login: e.target.value }))
              }
              required
              disabled={passwordLoading}
            />

            <MaterialInput
              label="Senha Atual"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              required
              disabled={passwordLoading}
            />

            <MaterialInput
              label="Nova Senha"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              required
              disabled={passwordLoading}
            />

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full touch-target"
              disabled={
                passwordLoading ||
                !passwordData.login ||
                !passwordData.currentPassword ||
                !passwordData.newPassword
              }
            >
              {passwordLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Alterar Senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
