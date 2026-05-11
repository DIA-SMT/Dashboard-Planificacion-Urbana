// Re-exporta el cliente singleton del browser para que toda la app comparta
// la misma instancia de Supabase (auth + queries). Ver `lib/supabase/client.ts`.
import { createClient } from '@/lib/supabase/client'

export const supabase = createClient()
