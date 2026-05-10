import React from "react";
import { useNavigate } from "react-router-dom";
import OnboardingFlow from "@/components/OnboardingFlow";

const Novo = () => {
  const navigate = useNavigate();

  return (
    <OnboardingFlow
      onComplete={() => navigate("/")}
      onBack={() => navigate("/")}
    />
  );
};

export default Novo;
