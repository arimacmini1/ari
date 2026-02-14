import { z } from 'zod'

export const PluginCertificationSubmitSchema = z.object({
  versionId: z.string().uuid(),
})

export type PluginCertificationSubmitInput = z.infer<typeof PluginCertificationSubmitSchema>

export const PluginCertificationDecisionSchema = z.object({
  status: z.enum(['approved', 'denied']),
  reason: z.string().max(2000).optional(),
})

export type PluginCertificationDecisionInput = z.infer<typeof PluginCertificationDecisionSchema>

