/**
 * Analytics Pane Layout
 * Feature: F06-MH-02 (Analytics Dashboard Layout & KPI Cards)
 *
 * Top-level layout for the `/analytics` route
 */

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {children}
    </div>
  );
}
