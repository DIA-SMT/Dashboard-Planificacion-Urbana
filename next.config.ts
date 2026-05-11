import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        // Desactivar el Router Cache del cliente — la app maneja sus propias
        // refetches con Supabase. Sin esto, navegar entre /, /kanban y /cronograma
        // muestra datos cacheados sin re-ejecutar los useEffect.
        staleTimes: {
            dynamic: 0,
            static: 0,
        },
    },
};

export default nextConfig;
