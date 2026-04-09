import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresa } from "@/contexts/EmpresaContext";

export type UserRole = "socio_admin" | "financeiro_aprovador" | "financeiro_operador" | "visualizador" | null;

interface UseRoleResult {
  role: UserRole;
  loading: boolean;
  // Role booleans
  isAdmin: boolean;
  isAprovador: boolean;
  isOperador: boolean;
  isVisualizador: boolean;
  // Permission checks
  canWrite: boolean;       // admin, aprovador, operador
  canApprove: boolean;     // admin, aprovador
  canManageUsers: boolean; // admin only
  canManageEmpresas: boolean; // admin only
}

export function useRole(): UseRoleResult {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresa();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRole = async () => {
      setLoading(true);

      try {
        // Fetch role from user_roles
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (cancelled) return;

        if (roleError || !roleData) {
          setRole(null);
          setLoading(false);
          return;
        }

        const fetchedRole = (roleData as any).role as UserRole;

        // If empresa is available, confirm access via empresa_users
        if (empresaAtual?.id) {
          const { data: empresaAccess, error: empresaError } = await supabase
            .from("empresa_users" as any)
            .select("empresa_id")
            .eq("user_id", user.id)
            .eq("empresa_id", empresaAtual.id)
            .limit(1)
            .single();

          if (cancelled) return;

          // socio_admin bypasses empresa-level access check
          if (empresaError || !empresaAccess) {
            if (fetchedRole !== "socio_admin") {
              setRole(null);
              setLoading(false);
              return;
            }
          }
        }

        setRole(fetchedRole);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [user, empresaAtual?.id]);

  const isAdmin = role === "socio_admin";
  const isAprovador = role === "financeiro_aprovador";
  const isOperador = role === "financeiro_operador";
  const isVisualizador = role === "visualizador";

  const canWrite = isAdmin || isAprovador || isOperador;
  const canApprove = isAdmin || isAprovador;
  const canManageUsers = isAdmin;
  const canManageEmpresas = isAdmin;

  return {
    role,
    loading,
    isAdmin,
    isAprovador,
    isOperador,
    isVisualizador,
    canWrite,
    canApprove,
    canManageUsers,
    canManageEmpresas,
  };
}
