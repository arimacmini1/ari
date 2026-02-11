import { z } from 'zod';

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const PluginPermissionSchema = z.enum([
  'network',
  'filesystem',
  'model_access',
  'secrets',
]);

export const PluginManifestSchema = z.object({
  name: z.string().min(2),
  version: z.string().regex(SEMVER_REGEX, 'Version must be semver (e.g. 1.0.0)'),
  description: z.string().min(1),
  author: z.string().min(1),
  entrypoint: z.string().min(1),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  compatibility: z.array(z.string()).default([]),
  permissions: z.array(PluginPermissionSchema).default([]),
  pricing: z.record(z.any()).default({}),
});

export type PluginManifestInput = z.infer<typeof PluginManifestSchema>;

export const PluginPublishInputSchema = z.object({
  manifest: PluginManifestSchema,
});

export type PluginPublishInput = z.infer<typeof PluginPublishInputSchema>;
