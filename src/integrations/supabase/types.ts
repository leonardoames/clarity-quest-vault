export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias_financeiras: {
        Row: {
          ativa: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
        }
        Update: {
          ativa?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_caixa: {
        Row: {
          agencia: string | null
          ativa: boolean
          banco: string | null
          created_at: string
          descricao: string | null
          digito: string | null
          empresa_id: string
          id: string
          nome: string
          numero_conta: string | null
          saldo_inicial: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          created_at?: string
          descricao?: string | null
          digito?: string | null
          empresa_id: string
          id?: string
          nome: string
          numero_conta?: string | null
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativa?: boolean
          banco?: string | null
          created_at?: string
          descricao?: string | null
          digito?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          numero_conta?: string | null
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_caixa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          agendado: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          categoria_id: string | null
          centro_custo_id: string | null
          competencia: string
          conta_caixa_id: string | null
          created_at: string
          criado_por: string | null
          data_movimento: string | null
          data_pagamento: string | null
          data_prevista: string | null
          desconto: number | null
          descricao: string
          empresa_id: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          fornecedor_id: string | null
          id: string
          importacao_id: string | null
          juros: number | null
          multa: number | null
          nota_fiscal: string | null
          observacao: string | null
          observacao_aprovacao: string | null
          origem_lancamento: string | null
          parcela_atual: number | null
          qtd_recorrencia: number | null
          recorrencia: Database["public"]["Enums"]["tipo_recorrencia"]
          status: Database["public"]["Enums"]["status_pagar"]
          taxas: number | null
          total_parcelas: number | null
          updated_at: string
          valor: number
          valor_original: number | null
          vencimento: string
        }
        Insert: {
          agendado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          competencia: string
          conta_caixa_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_movimento?: string | null
          data_pagamento?: string | null
          data_prevista?: string | null
          desconto?: number | null
          descricao: string
          empresa_id: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          fornecedor_id?: string | null
          id?: string
          importacao_id?: string | null
          juros?: number | null
          multa?: number | null
          nota_fiscal?: string | null
          observacao?: string | null
          observacao_aprovacao?: string | null
          origem_lancamento?: string | null
          parcela_atual?: number | null
          qtd_recorrencia?: number | null
          recorrencia?: Database["public"]["Enums"]["tipo_recorrencia"]
          status?: Database["public"]["Enums"]["status_pagar"]
          taxas?: number | null
          total_parcelas?: number | null
          updated_at?: string
          valor: number
          valor_original?: number | null
          vencimento: string
        }
        Update: {
          agendado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          competencia?: string
          conta_caixa_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_movimento?: string | null
          data_pagamento?: string | null
          data_prevista?: string | null
          desconto?: number | null
          descricao?: string
          empresa_id?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          fornecedor_id?: string | null
          id?: string
          importacao_id?: string | null
          juros?: number | null
          multa?: number | null
          nota_fiscal?: string | null
          observacao?: string | null
          observacao_aprovacao?: string | null
          origem_lancamento?: string | null
          parcela_atual?: number | null
          qtd_recorrencia?: number | null
          recorrencia?: Database["public"]["Enums"]["tipo_recorrencia"]
          status?: Database["public"]["Enums"]["status_pagar"]
          taxas?: number | null
          total_parcelas?: number | null
          updated_at?: string
          valor?: number
          valor_original?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_caixa_id_fkey"
            columns: ["conta_caixa_id"]
            isOneToOne: false
            referencedRelation: "contas_caixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_planilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          agendado: boolean | null
          aprovado_em: string | null
          aprovado_por: string | null
          categoria_id: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          competencia: string
          conta_caixa_id: string | null
          created_at: string
          criado_por: string | null
          data_movimento: string | null
          data_prevista: string | null
          data_recebimento: string | null
          desconto: number | null
          descricao: string
          empresa_id: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          importacao_id: string | null
          juros: number | null
          multa: number | null
          nota_fiscal: string | null
          observacao: string | null
          observacao_aprovacao: string | null
          observacoes: string | null
          origem_lancamento: string | null
          parcela_atual: number | null
          qtd_recorrencia: number | null
          recorrencia: Database["public"]["Enums"]["tipo_recorrencia"]
          status: Database["public"]["Enums"]["status_receber"]
          taxas: number | null
          total_parcelas: number | null
          updated_at: string
          valor: number
          valor_original: number | null
          vencimento: string
        }
        Insert: {
          agendado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          competencia: string
          conta_caixa_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_movimento?: string | null
          data_prevista?: string | null
          data_recebimento?: string | null
          desconto?: number | null
          descricao: string
          empresa_id: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          importacao_id?: string | null
          juros?: number | null
          multa?: number | null
          nota_fiscal?: string | null
          observacao?: string | null
          observacao_aprovacao?: string | null
          observacoes?: string | null
          origem_lancamento?: string | null
          parcela_atual?: number | null
          qtd_recorrencia?: number | null
          recorrencia?: Database["public"]["Enums"]["tipo_recorrencia"]
          status?: Database["public"]["Enums"]["status_receber"]
          taxas?: number | null
          total_parcelas?: number | null
          updated_at?: string
          valor: number
          valor_original?: number | null
          vencimento: string
        }
        Update: {
          agendado?: boolean | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          competencia?: string
          conta_caixa_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_movimento?: string | null
          data_prevista?: string | null
          data_recebimento?: string | null
          desconto?: number | null
          descricao?: string
          empresa_id?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          importacao_id?: string | null
          juros?: number | null
          multa?: number | null
          nota_fiscal?: string | null
          observacao?: string | null
          observacao_aprovacao?: string | null
          observacoes?: string | null
          origem_lancamento?: string | null
          parcela_atual?: number | null
          qtd_recorrencia?: number | null
          recorrencia?: Database["public"]["Enums"]["tipo_recorrencia"]
          status?: Database["public"]["Enums"]["status_receber"]
          taxas?: number | null
          total_parcelas?: number | null
          updated_at?: string
          valor?: number
          valor_original?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_caixa_id_fkey"
            columns: ["conta_caixa_id"]
            isOneToOne: false
            referencedRelation: "contas_caixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_planilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuicao_lucro_socios: {
        Row: {
          created_at: string
          distribuicao_id: string
          id: string
          socio_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          distribuicao_id: string
          id?: string
          socio_id: string
          valor: number
        }
        Update: {
          created_at?: string
          distribuicao_id?: string
          id?: string
          socio_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuicao_lucro_socios_distribuicao_id_fkey"
            columns: ["distribuicao_id"]
            isOneToOne: false
            referencedRelation: "distribuicoes_lucro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuicao_lucro_socios_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuicoes_lucro: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          competencia: string
          created_at: string
          criado_por: string | null
          data_efetiva: string | null
          empresa_id: string
          id: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_aprovacao"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          competencia: string
          created_at?: string
          criado_por?: string | null
          data_efetiva?: string | null
          empresa_id: string
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_aprovacao"]
          updated_at?: string
          valor_total: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          competencia?: string
          created_at?: string
          criado_por?: string | null
          data_efetiva?: string | null
          empresa_id?: string
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_aprovacao"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuicoes_lucro_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_users: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_users_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean
          cnpj: string | null
          cor_principal: string | null
          created_at: string
          data_inicio_operacional: string | null
          id: string
          logo_url: string | null
          moeda_padrao: string | null
          nome: string
          observacoes_internas: string | null
          razao_social: string | null
          segmento: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cnpj?: string | null
          cor_principal?: string | null
          created_at?: string
          data_inicio_operacional?: string | null
          id?: string
          logo_url?: string | null
          moeda_padrao?: string | null
          nome: string
          observacoes_internas?: string | null
          razao_social?: string | null
          segmento?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cnpj?: string | null
          cor_principal?: string | null
          created_at?: string
          data_inicio_operacional?: string | null
          id?: string
          logo_url?: string | null
          moeda_padrao?: string | null
          nome?: string
          observacoes_internas?: string | null
          razao_social?: string | null
          segmento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fechamentos_mensais: {
        Row: {
          competencia: string
          created_at: string
          empresa_id: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          observacao: string | null
          reaberto_em: string | null
          reaberto_por: string | null
          status: Database["public"]["Enums"]["status_fechamento"]
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          empresa_id: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacao?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
          status?: Database["public"]["Enums"]["status_fechamento"]
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          empresa_id?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacao?: string | null
          reaberto_em?: string | null
          reaberto_por?: string | null
          status?: Database["public"]["Enums"]["status_fechamento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_mensais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_acoes: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          empresa_id: string | null
          id: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          empresa_id?: string | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          empresa_id?: string | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_acoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_planilhas: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          empresa_id: string
          id: string
          linhas_com_erro: number | null
          linhas_validas: number | null
          nome_arquivo: string | null
          observacoes: string | null
          revertido_em: string | null
          revertido_por: string | null
          status: string | null
          tipo: string
          total_linhas: number | null
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          empresa_id: string
          id?: string
          linhas_com_erro?: number | null
          linhas_validas?: number | null
          nome_arquivo?: string | null
          observacoes?: string | null
          revertido_em?: string | null
          revertido_por?: string | null
          status?: string | null
          tipo: string
          total_linhas?: number | null
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          empresa_id?: string
          id?: string
          linhas_com_erro?: number | null
          linhas_validas?: number | null
          nome_arquivo?: string | null
          observacoes?: string | null
          revertido_em?: string | null
          revertido_por?: string | null
          status?: string | null
          tipo?: string
          total_linhas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_planilhas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_societarias: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          criado_por: string | null
          data: string
          descricao: string | null
          empresa_id: string
          id: string
          importacao_id: string | null
          observacao_aprovacao: string | null
          socio_id: string
          status: Database["public"]["Enums"]["status_aprovacao"]
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          importacao_id?: string | null
          observacao_aprovacao?: string | null
          socio_id: string
          status?: Database["public"]["Enums"]["status_aprovacao"]
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          importacao_id?: string | null
          observacao_aprovacao?: string | null
          socio_id?: string
          status?: Database["public"]["Enums"]["status_aprovacao"]
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_societarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_societarias_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_planilhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_societarias_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      socios: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          percentual_societario: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          percentual_societario?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          percentual_societario?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_categorias_ecommerce: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      criar_categorias_padrao: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      criar_centros_custo_padrao: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_approve: { Args: { _user_id: string }; Returns: boolean }
      user_can_write: { Args: { _user_id: string }; Returns: boolean }
      user_has_empresa_access: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "socio_admin"
        | "financeiro_aprovador"
        | "financeiro_operador"
        | "visualizador"
      forma_pagamento:
        | "pix"
        | "boleto"
        | "transferencia"
        | "cartao_credito"
        | "cartao_debito"
        | "dinheiro"
        | "cheque"
        | "outro"
      status_aprovacao: "rascunho" | "pendente" | "aprovado" | "reprovado"
      status_fechamento: "aberto" | "em_fechamento" | "fechado"
      status_pagar:
        | "rascunho"
        | "pendente"
        | "aprovado"
        | "pago"
        | "vencido"
        | "cancelado"
        | "reprovado"
      status_receber:
        | "rascunho"
        | "pendente"
        | "aprovado"
        | "recebido"
        | "vencido"
        | "cancelado"
        | "perdido"
        | "reprovado"
      tipo_categoria: "receita" | "despesa" | "ambos"
      tipo_movimentacao:
        | "aporte_capital"
        | "emprestimo_socio"
        | "adiantamento_socio"
        | "retirada_socio"
        | "devolucao_socio"
      tipo_recorrencia:
        | "nenhuma"
        | "mensal"
        | "bimestral"
        | "trimestral"
        | "semestral"
        | "anual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "socio_admin",
        "financeiro_aprovador",
        "financeiro_operador",
        "visualizador",
      ],
      forma_pagamento: [
        "pix",
        "boleto",
        "transferencia",
        "cartao_credito",
        "cartao_debito",
        "dinheiro",
        "cheque",
        "outro",
      ],
      status_aprovacao: ["rascunho", "pendente", "aprovado", "reprovado"],
      status_fechamento: ["aberto", "em_fechamento", "fechado"],
      status_pagar: [
        "rascunho",
        "pendente",
        "aprovado",
        "pago",
        "vencido",
        "cancelado",
        "reprovado",
      ],
      status_receber: [
        "rascunho",
        "pendente",
        "aprovado",
        "recebido",
        "vencido",
        "cancelado",
        "perdido",
        "reprovado",
      ],
      tipo_categoria: ["receita", "despesa", "ambos"],
      tipo_movimentacao: [
        "aporte_capital",
        "emprestimo_socio",
        "adiantamento_socio",
        "retirada_socio",
        "devolucao_socio",
      ],
      tipo_recorrencia: [
        "nenhuma",
        "mensal",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
      ],
    },
  },
} as const
