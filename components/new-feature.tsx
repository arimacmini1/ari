'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  type NewFeatureConfig,
  type NewFeatureItem,
  createNewFeatureItem,
  fetchNewFeatureData,
  getFeatureSummary,
  sortItemsByValue,
  defaultNewFeatureConfig,
} from '@/lib/new-feature';

interface NewFeatureProps {
  config?: Partial<NewFeatureConfig>;
  className?: string;
}

export function NewFeature({ config, className }: NewFeatureProps) {
  const [items, setItems] = useState<NewFeatureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isAdding, setIsAdding] = useState(false);

  const featureConfig: NewFeatureConfig = {
    ...defaultNewFeatureConfig,
    ...config,
  };

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchNewFeatureData();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    if (featureConfig.enabled) {
      loadData();
    }
  }, [featureConfig.enabled]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemName.trim() || !newItemValue) return;
    
    const value = parseFloat(newItemValue);
    if (isNaN(value) || value < 0) return;

    setIsAdding(true);
    
    try {
      const newItem = createNewFeatureItem(newItemName.trim(), value);
      
      if (featureConfig.maxItems && items.length >= featureConfig.maxItems) {
        setItems((prev) => [...prev.slice(1), newItem]);
      } else {
        setItems((prev) => [...prev, newItem]);
      }
      
      setNewItemName('');
      setNewItemValue('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSort = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setItems((prev) => sortItemsByValue(prev, sortOrder));
  };

  const summary = getFeatureSummary(items);
  const isAtMax = featureConfig.maxItems ? items.length >= featureConfig.maxItems : false;

  if (!featureConfig.enabled) {
    return null;
  }

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {featureConfig.title}
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardTitle>
            {featureConfig.description && (
              <CardDescription>{featureConfig.description}</CardDescription>
            )}
          </div>
          {featureConfig.maxItems && (
            <Badge variant={isAtMax ? 'destructive' : 'secondary'}>
              {items.length}/{featureConfig.maxItems}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-sm font-semibold">{summary.average.toFixed(1)}</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">Items</p>
            <p className="text-sm font-semibold">{items.length}</p>
          </div>
        </div>

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="item-name" className="sr-only">
                Name
              </Label>
              <Input
                id="item-name"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <div className="w-24">
              <Label htmlFor="item-value" className="sr-only">
                Value
              </Label>
              <Input
                id="item-value"
                type="number"
                placeholder="Value"
                min="0"
                step="1"
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <Button type="submit" size="icon" disabled={isAdding || !newItemName.trim() || !newItemValue}>
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Items</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSort}
              disabled={isLoading || items.length === 0}
            >
              <ArrowUpDown className="h-3 w-3 mr-1" />
              Sort
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items yet. Add one above.
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.value}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default NewFeature;
