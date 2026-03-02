/**
 * Rotas de debug (somente leitura) para inspecionar módulos/tenant no banco.
 * Usar apenas em desenvolvimento. Em produção, desabilitar ou proteger.
 */
import { Hono } from 'hono';
declare const debugRoutes: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export { debugRoutes };
//# sourceMappingURL=debug.routes.d.ts.map