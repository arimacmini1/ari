'use client';

import { TraceViewerModal } from '@/components/aei/trace-viewer-modal';
import { useEffect, useState } from 'react';

export default function TraceExecutionPage({
  params,
}: {
  params: { executionId: string };
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [params.executionId]);

  return (
    <div className="h-screen bg-background text-foreground">
      <TraceViewerModal
        executionId={decodeURIComponent(params.executionId)}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

