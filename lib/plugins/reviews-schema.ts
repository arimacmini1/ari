import { z } from 'zod'

export const PluginReviewCreateSchema = z.object({
  versionId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(4000).default(''),
})

export type PluginReviewCreateInput = z.infer<typeof PluginReviewCreateSchema>

export const PluginReviewModerateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().max(2000).optional(),
})

export type PluginReviewModerateInput = z.infer<typeof PluginReviewModerateSchema>

export const PluginReviewReportSchema = z.object({
  reason: z.string().min(3).max(2000),
})

export type PluginReviewReportInput = z.infer<typeof PluginReviewReportSchema>

