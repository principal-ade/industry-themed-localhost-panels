/**
 * Panel Tools
 *
 * UTCP-compatible tools for the Localhost Browser panel extension.
 * These tools can be invoked by AI agents and emit events that panels listen for.
 *
 * IMPORTANT: This file should NOT import any React components to ensure
 * it can be imported server-side without pulling in React dependencies.
 * Use the './tools' subpath export for server-safe imports.
 */

import type {
  PanelTool,
  PanelToolsMetadata,
} from '@principal-ade/utcp-panel-event';

/**
 * Tool: Navigate to URL
 * Navigates the localhost browser to a specific port and path
 */
export const navigateToUrlTool: PanelTool = {
  name: 'navigate_to_localhost',
  description:
    'Navigates the localhost browser panel to a specific port and optional path',
  inputs: {
    type: 'object',
    properties: {
      port: {
        type: 'number',
        description:
          'The localhost port number to navigate to (1-65535). Common ports: 3000 (React), 5173 (Vite), 8080 (Webpack), 6006 (Storybook)',
      },
      path: {
        type: 'string',
        description: 'Optional path to append to the URL (default: "/")',
      },
    },
    required: ['port'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      url: { type: 'string' },
    },
  },
  tags: ['localhost', 'browser', 'navigation', 'development'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'principal-ade.localhost-browser:navigate',
  },
};

/**
 * Tool: Reload Page
 * Reloads the current page in the localhost browser
 */
export const reloadPageTool: PanelTool = {
  name: 'reload_localhost_page',
  description: 'Reloads the current page in the localhost browser panel',
  inputs: {
    type: 'object',
    properties: {},
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
    },
  },
  tags: ['localhost', 'browser', 'reload', 'refresh'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'principal-ade.localhost-browser:reload',
  },
};

/**
 * Tool: Go Back
 * Navigates back in the localhost browser history
 */
export const goBackTool: PanelTool = {
  name: 'localhost_go_back',
  description: 'Navigates back in the localhost browser history',
  inputs: {
    type: 'object',
    properties: {},
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
    },
  },
  tags: ['localhost', 'browser', 'navigation', 'history'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'principal-ade.localhost-browser:go-back',
  },
};

/**
 * Tool: Go Forward
 * Navigates forward in the localhost browser history
 */
export const goForwardTool: PanelTool = {
  name: 'localhost_go_forward',
  description: 'Navigates forward in the localhost browser history',
  inputs: {
    type: 'object',
    properties: {},
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
    },
  },
  tags: ['localhost', 'browser', 'navigation', 'history'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'principal-ade.localhost-browser:go-forward',
  },
};

/**
 * All tools exported as an array.
 */
export const localhostBrowserTools: PanelTool[] = [
  navigateToUrlTool,
  reloadPageTool,
  goBackTool,
  goForwardTool,
];

/**
 * Panel tools metadata for registration with PanelToolRegistry.
 */
export const localhostBrowserToolsMetadata: PanelToolsMetadata = {
  id: 'principal-ade.localhost-browser',
  name: 'Localhost Browser',
  description:
    'Tools for controlling the localhost browser panel - navigate to dev servers, reload, and browse history',
  tools: localhostBrowserTools,
};
