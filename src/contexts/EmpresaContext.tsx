import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Empresa {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  ativa: boolean;
}

interface EmpresaContextType {
  empresas: Empresa[];
  empresaAtual: Empresa | null;
  setEmpresaAtual: (empresa: Empresa) => void;
  loading: boolean;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaAtual, setEmpresaAtual] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEmpresas([]);
      setEmpresaAtual(null);
      setLoading(false);
      return;
    }

    const fetchEmpresas = async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("ativa", true)
        .order("nome");

      if (!error && data) {
        setEmpresas(data);
        if (data.length > 0 && !empresaAtual) {
          setEmpresaAtual(data[0]);
        }
      }
      setLoading(false);
    };

    fetchEmpresas();
  }, [user]);

  return (
    <EmpresaContext.Provider value={{ empresas, empresaAtual, setEmpresaAtual, loading }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa must be used within EmpresaProvider");
  return ctx;
}
