export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            eje_tematico: {
                Row: {
                    id: string
                    nombre: string
                    color: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    nombre: string
                    color?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    nombre?: string
                    color?: string | null
                    created_at?: string | null
                }
                Relationships: []
            }
            members: {
                Row: {
                    id: string
                    full_name: string
                    email: string | null
                    empresa: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    full_name: string
                    email?: string | null
                    empresa?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    full_name?: string
                    email?: string | null
                    empresa?: string | null
                    created_at?: string | null
                }
                Relationships: []
            }
            projects: {
                Row: {
                    id: string
                    codigo: string | null
                    nombre: string
                    descripcion_tecnica: string | null
                    eje_tematico_id: string | null
                    estado: string
                    prioridad: string | null
                    fecha_inicio: string | null
                    deadline: string | null
                    monto: number | null
                    n_expediente: string | null
                    observaciones: string | null
                    responsable_nombre: string | null
                    completed_at: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    codigo?: string | null
                    nombre: string
                    descripcion_tecnica?: string | null
                    eje_tematico_id?: string | null
                    estado?: string
                    prioridad?: string | null
                    fecha_inicio?: string | null
                    deadline?: string | null
                    monto?: number | null
                    n_expediente?: string | null
                    observaciones?: string | null
                    responsable_nombre?: string | null
                    completed_at?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    codigo?: string | null
                    nombre?: string
                    descripcion_tecnica?: string | null
                    eje_tematico_id?: string | null
                    estado?: string
                    prioridad?: string | null
                    fecha_inicio?: string | null
                    deadline?: string | null
                    monto?: number | null
                    n_expediente?: string | null
                    observaciones?: string | null
                    responsable_nombre?: string | null
                    completed_at?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "projects_eje_tematico_id_fkey"
                        columns: ["eje_tematico_id"]
                        isOneToOne: false
                        referencedRelation: "eje_tematico"
                        referencedColumns: ["id"]
                    }
                ]
            }
            project_empresas: {
                Row: {
                    project_id: string
                    member_id: string
                    created_at: string | null
                }
                Insert: {
                    project_id: string
                    member_id: string
                    created_at?: string | null
                }
                Update: {
                    project_id?: string
                    member_id?: string
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "project_empresas_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_empresas_member_id_fkey"
                        columns: ["member_id"]
                        isOneToOne: false
                        referencedRelation: "members"
                        referencedColumns: ["id"]
                    }
                ]
            }
            hitos: {
                Row: {
                    id: string
                    project_id: string
                    titulo: string
                    estado: string
                    notas: string | null
                    link: string | null
                    orden: number | null
                    es_critico: boolean | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    project_id: string
                    titulo: string
                    estado?: string
                    notas?: string | null
                    link?: string | null
                    orden?: number | null
                    es_critico?: boolean | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    project_id?: string
                    titulo?: string
                    estado?: string
                    notas?: string | null
                    link?: string | null
                    orden?: number | null
                    es_critico?: boolean | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "hitos_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    avatar_url: string | null
                    role: string
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never
