'use client';

import { TraceViewerModal } from '@/components/aei/trace-viewer-modal';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function TraceExecutionPage() {
  const params = useParams<{ executionId: string }>();
  const executionId = params.executionId ? decodeURIComponent(params.executionId) : '';
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [executionId]);

  return (
    <div className="h-screen bg-background text-foreground">
      <TraceViewerModal
        executionId={executionId}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
