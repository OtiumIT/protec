import { z } from 'zod';

export const ActivateModuleSchema = z.object({
  moduleId: z.string().uuid(),
  enabledUntil: z.date().optional(),
});

export const DeactivateModuleSchema = z.object({
  moduleId: z.string().uuid(),
});

export const SetModuleHiddenSchema = z.object({
  hidden: z.boolean(),
});

export const AddModuleToPlanSchema = z.object({
  moduleId: z.string().uuid(),
  isDefault: z.boolean().default(true),
});

export const PlanIdParamSchema = z.object({
  planId: z.string().uuid(),
});
