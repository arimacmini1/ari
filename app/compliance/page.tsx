'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogViewer } from '@/components/compliance/audit-log-viewer';
import { ComplianceDashboard } from '@/components/compliance/compliance-dashboard';

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState('audit');

  const summary = useMemo(
    () => ({
      title: 'Security & Compliance',
      subtitle: 'Audit logs, RBAC enforcement, and readiness checks.',
    }),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('compliance.activeTab');
    if (saved) {
      setActiveTab(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('compliance.activeTab', activeTab);
  }, [activeTab]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{summary.title}</h1>
            <Badge className="bg-emerald-600/20 text-emerald-200 border border-emerald-500/40">
              Live
            </Badge>
          </div>
          <p className="text-slate-400">{summary.subtitle}</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg">Compliance Toolkit</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-800/70 text-slate-300">
                <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                <TabsTrigger value="checklist">Compliance Checklist</TabsTrigger>
              </TabsList>
              <TabsContent value="audit" className="mt-6">
                <AuditLogViewer />
              </TabsContent>
              <TabsContent value="checklist" className="mt-6">
                <ComplianceDashboard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
