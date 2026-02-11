'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  context: Record<string, any>;
}

interface AuditLogResponse {
  entries: AuditLogEntry[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

const ACTION_OPTIONS = [
  'all',
  'execute',
  'assign',
  'override',
  'pause',
  'resume',
  'delete',
  'create',
  'update',
  'export',
  'access',
];

const RESOURCE_OPTIONS = [
  'all',
  'workflow',
  'task',
  'agent',
  'user',
  'role',
  'permission',
  'config',
  'report',
];

const PAGE_SIZE = 100;

function toDateInputValue(date: Date) {
  return date.toISOString().split('T')[0];
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(toDateInputValue(new Date(today.getTime() - 29 * 86400000)));
  const [endDate, setEndDate] = useState(toDateInputValue(today));
  const [actorFilter, setActorFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceIdFilter, setResourceIdFilter] = useState('');

  const uniqueActors = useMemo(() => {
    const actors = new Set(entries.map((entry) => entry.actor));
    return ['all', ...Array.from(actors)];
  }, [entries]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildQueryParams = useCallback(
    (exportFormat?: 'csv' | 'json') => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      params.set('sort', sort);

      if (actorFilter !== 'all') params.set('actor', actorFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceTypeFilter !== 'all') params.set('resource_type', resourceTypeFilter);
      if (resourceIdFilter.trim()) params.set('resource_id', resourceIdFilter.trim());
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (exportFormat) params.set('export', exportFormat);

      return params;
    },
    [actorFilter, actionFilter, resourceTypeFilter, resourceIdFilter, startDate, endDate, page, sort]
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams();
      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load audit logs.');
      }
      const data: AuditLogResponse = await response.json();
      setEntries(data.entries || []);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = buildQueryParams(format);
      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Export failed.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-logs-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Card className="bg-slate-900 border-slate-800 p-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Start Date</span>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">End Date</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Actor</span>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Actor" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueActors.map((actor) => (
                    <SelectItem key={actor} value={actor}>
                      {actor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Action</span>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Resource</span>
              <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_OPTIONS.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">Resource ID</span>
              <Input
                placeholder="resource-id"
                value={resourceIdFilter}
                onChange={(e) => setResourceIdFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => { setPage(0); loadLogs(); }}>
              <RefreshCw className="w-3 h-3 mr-2" />
              Apply Filters
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSort(sort === 'desc' ? 'asc' : 'desc')}
            >
              {sort === 'desc' ? (
                <ArrowDownWideNarrow className="w-3 h-3 mr-2" />
              ) : (
                <ArrowUpWideNarrow className="w-3 h-3 mr-2" />
              )}
              Sort {sort === 'desc' ? 'Newest' : 'Oldest'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-3 h-3 mr-2" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('json')}>
              <Download className="w-3 h-3 mr-2" />
              Export JSON
            </Button>
            <span className="text-xs text-slate-400 ml-auto">
              {totalCount} total entries
            </span>
          </div>
        </Card>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Audit Timeline</h3>
            <p className="text-xs text-slate-400">Showing {PAGE_SIZE} entries per page</p>
          </div>
          <Badge className="bg-slate-800 text-slate-200 border border-slate-700">
            Page {page + 1} of {totalPages}
          </Badge>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-slate-400 text-sm">Loading audit logs...</div>
          ) : entries.length === 0 ? (
            <div className="text-slate-400 text-sm">No audit logs found for the selected filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>Context</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-slate-300">
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{entry.actor}</TableCell>
                    <TableCell>
                      <Badge className="bg-slate-800 text-slate-200 border border-slate-700">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{entry.resource_type}</TableCell>
                    <TableCell className="text-xs font-mono">{entry.resource_id}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {entry.context ? JSON.stringify(entry.context).slice(0, 120) : '{}'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="px-4 pb-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
          >
            Next
          </Button>
          <span className="text-xs text-slate-400 ml-auto">
            Offset {page * PAGE_SIZE}
          </span>
        </div>
      </Card>
    </div>
  );
}
