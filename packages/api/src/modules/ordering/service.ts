// Barrel re-export — split into domain-specific service files for maintainability.
// All existing imports from './service.js' continue to work unchanged.

export * from './services/categories.js';
export * from './services/items.js';
export * from './services/modifiers.js';
export * from './services/promotions.js';
export * from './services/combos.js';
export * from './services/orders.js';
export * from './services/analytics.js';
export * from './services/tables.js';
export * from './services/feedback.js';
export * from './services/translations.js';
