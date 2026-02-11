'use client';

/**
 * KPI Card Skeleton Loader
 * Feature: F06-MH-02 (Analytics Pane - Loading State)
 *
 * Skeleton component shown while KPI data is loading.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function KPICardSkeleton() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-6 w-12 bg-slate-800 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value placeholder */}
        <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />

        {/* Trend placeholder */}
        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />

        {/* Sparkline placeholder */}
        <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}
