import { LocalhostBrowserPanel } from './panels/LocalhostBrowserPanel';
import type { PanelDefinition, PanelContextValue } from './types';
import { localhostBrowserTools } from './tools';

/**
 * Export array of panel definitions.
 * This is the required export for panel extensions.
 */
export const panels: PanelDefinition[] = [
  {
    metadata: {
      id: 'principal-ade.localhost-browser',
      name: 'Localhost Browser',
      icon: '🌐',
      version: '0.1.0',
      author: 'Principal ADE',
      description:
        'An embedded browser panel for viewing localhost development servers (React, Vite, Storybook, etc.)',
      slices: [], // No data slices needed - this panel is standalone
      // UTCP-compatible tools this panel exposes
      tools: localhostBrowserTools,
    },
    component: LocalhostBrowserPanel,

    // Optional: Called when this specific panel is mounted
    onMount: async (context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log(
        'Localhost Browser Panel mounted',
        context.currentScope.repository?.path
      );
    },

    // Optional: Called when this specific panel is unmounted
    onUnmount: async (_context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log('Localhost Browser Panel unmounting');
    },
  },
];

/**
 * Optional: Called once when the entire package is loaded.
 * Use this for package-level initialization.
 */
export const onPackageLoad = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package loaded - Localhost Browser Panel Extension');
};

/**
 * Optional: Called once when the package is unloaded.
 * Use this for package-level cleanup.
 */
export const onPackageUnload = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package unloading - Localhost Browser Panel Extension');
};

/**
 * Export tools for server-safe imports.
 * Use '@principal-ade/localhost-browser-panel/tools' to import without React dependencies.
 */
export {
  localhostBrowserTools,
  localhostBrowserToolsMetadata,
  navigateToUrlTool,
  reloadPageTool,
  goBackTool,
  goForwardTool,
} from './tools';
