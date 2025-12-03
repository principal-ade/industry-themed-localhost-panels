import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { LocalhostBrowserPanel, type RunningServer } from './LocalhostBrowserPanel';
import {
  MockPanelProvider,
  createMockContext,
  createMockActions,
  createMockEvents,
} from '../mocks/panelContext';
import type { PanelEventEmitter } from '../types';

/**
 * LocalhostBrowserPanel provides an embedded browser for viewing localhost development servers.
 *
 * **Note:** The webview functionality only works in Electron environments.
 * In Storybook (browser), the port selection form will be shown but the
 * webview will not render actual content.
 *
 * ## Features
 * - Port and path input form
 * - Quick selection for common dev server ports
 * - Navigation controls (back, forward, reload, home)
 * - Open in external browser
 * - Tool integration for AI agents
 *
 * ## Electron Configuration
 * See `ELECTRON_WEBVIEW_NOTES.md` for required Electron configuration.
 */
const meta = {
  title: 'Panels/LocalhostBrowserPanel',
  component: LocalhostBrowserPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An embedded browser panel for viewing localhost development servers. Supports React, Vite, Webpack, Storybook, and other dev servers.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    context: createMockContext(),
    actions: createMockActions(),
    events: createMockEvents(),
  },
} satisfies Meta<typeof LocalhostBrowserPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - shows the port input form
 */
export const Default: Story = {
  render: () => (
    <MockPanelProvider>
      {(props) => <LocalhostBrowserPanel {...props} />}
    </MockPanelProvider>
  ),
};

/**
 * No repository context - panel works standalone
 */
export const NoRepository: Story = {
  render: () => (
    <MockPanelProvider
      contextOverrides={{
        currentScope: {
          type: 'workspace',
          workspace: {
            name: 'my-workspace',
            path: '/Users/developer/my-workspace',
          },
        },
      }}
    >
      {(props) => <LocalhostBrowserPanel {...props} />}
    </MockPanelProvider>
  ),
};

/**
 * With running servers - shows servers detected by the host
 */
export const WithRunningServers: Story = {
  render: () => {
    const context = createMockContext();
    const actions = createMockActions();
    const events = createMockEvents();

    const mockServers: RunningServer[] = [
      { port: 3000, label: 'React App' },
      { port: 6006, label: 'Storybook' },
      { port: 5173, label: 'Vite Dev Server' },
    ];

    // Wrapper to emit servers after mount
    const PanelWithServers = () => {
      useEffect(() => {
        // Simulate host sending running servers
        setTimeout(() => {
          (events as PanelEventEmitter).emit({
            type: 'principal-ade.localhost-browser:servers-update',
            source: 'host',
            timestamp: Date.now(),
            payload: { servers: mockServers },
          });
        }, 100);
      }, []);

      return (
        <LocalhostBrowserPanel
          context={context}
          actions={actions}
          events={events}
        />
      );
    };

    return <PanelWithServers />;
  },
};
