import { z } from 'zod';

export const ActivateModuleSchema = z.object({
  moduleId: z.string().uuid(),
  enabledUntil: z.date().optional(),
});

export const DeactivateModuleSchema = z.object({
  moduleId: z.string().uuid(),
});
