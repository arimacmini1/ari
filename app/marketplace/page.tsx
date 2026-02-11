'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface PluginVersion {
  id: string;
  version: string;
  deprecated: boolean;
  permissions: string[];
}

interface PluginListItem {
  id: string;
  name: string;
  description: string;
  author: string;
  categories: string[];
  status: string;
  latest_version?: PluginVersion;
}

interface Installation {
  plugin_id: string;
  version_id: string;
  status: 'installed' | 'disabled' | 'uninstalled';
  version: string;
}

export default function MarketplacePage() {
  const [plugins, setPlugins] = useState<PluginListItem[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const installationMap = useMemo(() => {
    const map = new Map<string, Installation>();
    installations.forEach((inst) => map.set(inst.plugin_id, inst));
    return map;
  }, [installations]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const [pluginsRes, installsRes] = await Promise.all([
        fetch(`/api/plugins?${params.toString()}`),
        fetch('/api/plugins/installations'),
      ]);
      if (pluginsRes.ok) {
        const data = await pluginsRes.json();
        setPlugins(data.plugins || []);
      }
      if (installsRes.ok) {
        const data = await installsRes.json();
        setInstallations(data.installations || []);
      }
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInstall = async (pluginId: string, versionId?: string) => {
    setBusyMap((prev) => ({ ...prev, [pluginId]: versionId ? 'Updating' : 'Installing' }));
    try {
      const response = await fetch(`/api/plugins/${pluginId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Install failed');
      }
      toast({
        title: versionId ? 'Plugin updated' : 'Plugin installed',
        description: 'Marketplace changes applied.',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Plugin install failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyMap((prev) => {
        const next = { ...prev };
        delete next[pluginId];
        return next;
      });
    }
  };

  const handleUninstall = async (pluginId: string) => {
    setBusyMap((prev) => ({ ...prev, [pluginId]: 'Uninstalling' }));
    try {
      const response = await fetch(`/api/plugins/${pluginId}/uninstall`, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Uninstall failed');
      }
      toast({
        title: 'Plugin uninstalled',
        description: 'Marketplace changes applied.',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Plugin uninstall failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyMap((prev) => {
        const next = { ...prev };
        delete next[pluginId];
        return next;
      });
    }
  };

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    setBusyMap((prev) => ({ ...prev, [pluginId]: enabled ? 'Enabling' : 'Disabling' }));
    try {
      const response = await fetch(`/api/plugins/${pluginId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Toggle failed');
      }
      toast({
        title: enabled ? 'Plugin enabled' : 'Plugin disabled',
        description: 'Marketplace changes applied.',
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Plugin toggle failed',
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyMap((prev) => {
        const next = { ...prev };
        delete next[pluginId];
        return next;
      });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Plugin Marketplace</h1>
          <p className="text-slate-400">Discover, install, and manage AEI plugins.</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800 mb-6">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg">Search & Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-3 md:flex-row">
            <Input
              className="bg-slate-950 border-slate-800"
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              className="bg-slate-950 border-slate-800"
              placeholder="Category (e.g. security, agent)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={loadData}>
              Apply
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-slate-400">Loading marketplace...</div>
        ) : plugins.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center text-slate-400">
              No plugins yet. Publish one via the registry API.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {plugins.map((plugin) => {
              const installation = installationMap.get(plugin.id);
              const latest = plugin.latest_version;
              const isInstalled = installation && installation.status !== 'uninstalled';
              const isDisabled = installation?.status === 'disabled';
              const needsUpdate = latest && installation && installation.version_id !== latest.id;
              const busyLabel = busyMap[plugin.id];
              const isBusy = Boolean(busyLabel);

              return (
                <Card key={plugin.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{plugin.name}</h3>
                          {latest?.deprecated ? (
                            <Badge className="bg-amber-600/20 text-amber-200 border border-amber-500/40">
                              Deprecated
                            </Badge>
                          ) : null}
                          {isDisabled ? (
                            <Badge className="bg-slate-700 text-slate-200 border border-slate-600">
                              Disabled
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-slate-400 mt-1">{plugin.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span>By {plugin.author}</span>
                          {latest?.version ? <span>Version {latest.version}</span> : null}
                          {plugin.categories?.length ? (
                            <span>Categories: {plugin.categories.join(', ')}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isInstalled ? (
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleInstall(plugin.id, latest?.id)}
                            disabled={isBusy}
                          >
                            {busyLabel ?? 'Install'}
                          </Button>
                        ) : (
                          <>
                            {needsUpdate ? (
                              <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleInstall(plugin.id, latest?.id)}
                                disabled={isBusy}
                              >
                                {busyLabel ?? 'Update'}
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              onClick={() => handleToggle(plugin.id, isDisabled)}
                              disabled={isBusy}
                            >
                              {busyLabel ?? (isDisabled ? 'Enable' : 'Disable')}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleUninstall(plugin.id)}
                              disabled={isBusy}
                            >
                              {busyLabel ?? 'Uninstall'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
