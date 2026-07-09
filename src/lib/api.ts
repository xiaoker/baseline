import { DEFAULT_DATA_SOURCE_DASHBOARD } from "./dataSources";
import { createEmptyDashboard } from "./emptyState";
import type { DashboardState, DataSourceConfig, DataSourceDashboard } from "./types";

export async function fetchDashboard(date?: string): Promise<DashboardState> {
  const url = date ? `/api/dashboard?date=${encodeURIComponent(date)}` : "/api/dashboard";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as DashboardState;
  } catch {
    return createEmptyDashboard(date);
  }
}

export async function fetchDataSources(): Promise<DataSourceDashboard> {
  try {
    const response = await fetch("/api/data-sources");
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as DataSourceDashboard;
  } catch {
    return DEFAULT_DATA_SOURCE_DASHBOARD;
  }
}

export async function updateDataSource(source: DataSourceConfig): Promise<boolean> {
  try {
    const response = await fetch(`/api/data-sources/${encodeURIComponent(source.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        enabled: source.enabled,
        schedule: source.schedule,
        targetTables: source.targetTables,
        freshnessHours: source.freshnessHours,
        purpose: source.purpose,
        owner: source.owner,
        config: source.config,
        notes: source.notes
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
