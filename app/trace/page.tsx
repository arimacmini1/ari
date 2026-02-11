'use client';

import { TraceViewer } from '@/components/aei/trace-viewer';

export default function TracePage() {
  return (
    <div className="h-screen bg-background text-foreground">
      <TraceViewer />
    </div>
  );
}
