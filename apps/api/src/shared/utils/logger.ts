/**
 * Logger estruturado
 * Registra operações sensíveis com user_id, company_id e timestamp
 */

export interface LogContext {
  userId?: string;
  companyId?: string;
  action: string;
  metadata?: Record<string, any>;
}

export function logOperation(context: LogContext): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Em produção, usar serviço de logging (ex: Winston, Pino)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrar com serviço de logging
    console.log(JSON.stringify(logEntry));
  } else {
    console.log('[LOG]', logEntry);
  }
}

/**
 * Log de operações sensíveis
 */
export function logSensitiveOperation(
  action: string,
  userId: string,
  companyId: string | null,
  metadata?: Record<string, any>
): void {
  logOperation({
    userId,
    companyId: companyId || undefined,
    action,
    metadata: {
      ...metadata,
      sensitive: true,
    },
  });
}
