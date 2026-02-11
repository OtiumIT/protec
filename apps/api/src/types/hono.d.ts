import type { User } from '@shared/core';

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
    companyId: string | null; // null para super_admin
    jwt: {
      userId: string;
      companyId: string | null; // null para super_admin
      email: string;
      role: string;
    };
  }
}
