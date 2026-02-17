/**
 * New Feature - Main Implementation
 * Business logic and utilities for the new feature
 */

import { z } from 'zod';

// Types
export interface NewFeatureConfig {
  enabled: boolean;
  title: string;
  description?: string;
  maxItems?: number;
}

export interface NewFeatureItem {
  id: string;
  name: string;
  value: number;
  createdAt: Date;
}

export interface NewFeatureState {
  items: NewFeatureItem[];
  isLoading: boolean;
  error: string | null;
}

// Validation Schema
export const newFeatureItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  value: z.number().min(0).max(1000),
  createdAt: z.date(),
});

export const newFeatureConfigSchema = z.object({
  enabled: z.boolean(),
  title: z.string().min(1).max(50),
  description: z.string().optional(),
  maxItems: z.number().min(1).max(100).optional(),
});

// Default configuration
export const defaultNewFeatureConfig: NewFeatureConfig = {
  enabled: true,
  title: 'New Feature',
  description: 'Feature description here',
  maxItems: 10,
};

// Utility functions
export function createNewFeatureItem(
  name: string,
  value: number
): NewFeatureItem {
  return {
    id: crypto.randomUUID(),
    name,
    value,
    createdAt: new Date(),
  };
}

export function validateNewFeatureItem(
  item: unknown
): NewFeatureItem | null {
  const result = newFeatureItemSchema.safeParse(item);
  return result.success ? result.data : null;
}

export function filterItemsByValue(
  items: NewFeatureItem[],
  minValue: number
): NewFeatureItem[] {
  return items.filter((item) => item.value >= minValue);
}

export function sortItemsByValue(
  items: NewFeatureItem[],
  order: 'asc' | 'desc' = 'asc'
): NewFeatureItem[] {
  return [...items].sort((a, b) => {
    return order === 'asc' ? a.value - b.value : b.value - a.value;
  });
}

export async function fetchNewFeatureData(): Promise<NewFeatureItem[]> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  return [
    createNewFeatureItem('Item 1', 100),
    createNewFeatureItem('Item 2', 250),
    createNewFeatureItem('Item 3', 75),
  ];
}

export function getFeatureSummary(items: NewFeatureItem[]): {
  total: number;
  average: number;
  highest: NewFeatureItem | null;
  lowest: NewFeatureItem | null;
} {
  if (items.length === 0) {
    return {
      total: 0,
      average: 0,
      highest: null,
      lowest: null,
    };
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const average = total / items.length;
  const sorted = sortItemsByValue(items, 'desc');

  return {
    total,
    average,
    highest: sorted[0],
    lowest: sorted[sorted.length - 1],
  };
}
