import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

type RouteComponent = () => ReactNode;

export interface MiniAppDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  basePath: string;
  navItems: NavItem[];
  merchantRoutes: RouteComponent[];
  customerRoutes: RouteComponent[];
}

const registry: MiniAppDefinition[] = [];

export function registerApp(app: MiniAppDefinition): void {
  const existing = registry.findIndex((a) => a.id === app.id);
  if (existing >= 0) {
    registry[existing] = app;
  } else {
    registry.push(app);
  }
}

export function getApps(): readonly MiniAppDefinition[] {
  return registry;
}

export function getApp(id: string): MiniAppDefinition | undefined {
  return registry.find((a) => a.id === id);
}
