import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import {
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Bug,
  Crosshair,
} from 'lucide-react';
import type { PanelComponentProps } from '../types';
import reactGrabScript from 'react-grab/dist/index.global.js?raw';

export interface RunningServer {
  port: number;
  label?: string;
  /** Optional detected service type (e.g., 'vite', 'next', 'express') */
  serviceType?: string;
  /** Process ID of the server */
  pid?: number;
  /** Working directory where the process was started (project root) */
  cwd?: string;
  /** Command that started the process (e.g., 'node', 'npm') */
  command?: string;
}

// Electron webview element interface
interface WebviewElement extends HTMLElement {
  src: string;
  loadURL: (url: string) => void;
  getURL: () => string;
  reload: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => void;
  goForward: () => void;
  openDevTools: (options?: { mode?: 'right' | 'bottom' | 'undocked' | 'detach' }) => void;
  isDevToolsOpened: () => boolean;
  closeDevTools: () => void;
  executeJavaScript: (code: string) => Promise<unknown>;
  addEventListener: (event: string, listener: (event: Event) => void) => void;
  removeEventListener: (
    event: string,
    listener: (event: Event) => void
  ) => void;
}

interface LocalhostBrowserPanelContentProps extends PanelComponentProps {
  initialPort?: number;
  initialPath?: string;
}

/**
 * LocalhostBrowserPanelContent - Internal component that uses theme
 */
const LocalhostBrowserPanelContent: React.FC<
  LocalhostBrowserPanelContentProps
> = ({
  context,
  actions: _actions,
  events,
  initialPort,
  initialPath = '/',
}) => {
  const { theme } = useTheme();
  const webviewRef = useRef<WebviewElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State for port/path input
  const [port, setPort] = useState<number | null>(initialPort ?? null);
  const [path, setPath] = useState(initialPath);
  const [portInput, setPortInput] = useState(
    initialPort?.toString() ?? '3000'
  );

  // Running servers from context (provided by Electron app's PanelContext)
  const runningServers = React.useMemo((): RunningServer[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxAny = context as any;

    // Check for direct localhostServers property (from ExtendedPanelContextValue)
    if (Array.isArray(ctxAny?.localhostServers)) {
      return ctxAny.localhostServers;
    }

    // Check via getSlice if available
    if (typeof context?.getSlice === 'function') {
      const slice = context.getSlice('localhostServers');
      if (slice?.data && Array.isArray(slice.data)) {
        return slice.data;
      }
    }

    return [];
  }, [context]);

  // React Grab element inspector
  const [reactGrabEnabled, setReactGrabEnabled] = useState(false);
  const [reactGrabInjected, setReactGrabInjected] = useState(false);

  const localhostUrl = port ? `http://localhost:${port}${path}` : '';

  // Subscribe to panel events for tool invocations
  useEffect(() => {
    const unsubscribers = [
      // Tool: navigate_to_url
      events.on<{ port: number; path?: string }>(
        'principal-ade.localhost-browser:navigate',
        (event) => {
          const { port: newPort, path: newPath } = event.payload || {};
          if (newPort) {
            setPort(newPort);
            setPath(newPath || '/');
            setPortInput(newPort.toString());
          }
        }
      ),

      // Tool: reload
      events.on('principal-ade.localhost-browser:reload', () => {
        webviewRef.current?.reload();
      }),

      // Tool: go_back
      events.on('principal-ade.localhost-browser:go-back', () => {
        if (webviewRef.current?.canGoBack()) {
          webviewRef.current.goBack();
        }
      }),

      // Tool: go_forward
      events.on('principal-ade.localhost-browser:go-forward', () => {
        if (webviewRef.current?.canGoForward()) {
          webviewRef.current.goForward();
        }
      }),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [events]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidStartLoading = () => {
      setIsLoading(true);
      setLoadError(null);
    };

    const handleDidStopLoading = () => {
      const url = webview.getURL();
      setIsLoading(false);
      setCurrentUrl(url);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handleDidNavigate = () => {
      const url = webview.getURL();
      setCurrentUrl(url);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    const handleDidFailLoad = (
      event: Event & { errorDescription?: string; errorCode?: number }
    ) => {
      setIsLoading(false);
      setLoadError(
        event.errorDescription || `Failed to load (error ${event.errorCode})`
      );
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
    };
  }, []);

  // Inject react-grab into the webview when enabled
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const injectReactGrab = async () => {
      if (!reactGrabEnabled) return;

      try {
        await webview.executeJavaScript(`
          (function() {
            if (window.__REACT_GRAB__) return;
            ${reactGrabScript}
          })();
        `);
        setReactGrabInjected(true);
      } catch (err) {
        console.error('Failed to inject react-grab:', err);
      }
    };

    const handleDidFinishLoad = () => {
      setReactGrabInjected(false);
      if (reactGrabEnabled) {
        injectReactGrab();
      }
    };

    webview.addEventListener('did-finish-load', handleDidFinishLoad);

    // If already loaded and enabled, inject now
    if (reactGrabEnabled && !reactGrabInjected) {
      injectReactGrab();
    }

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad);
    };
  }, [reactGrabEnabled, reactGrabInjected]);

  const handleReload = () => {
    webviewRef.current?.reload();
  };

  const handleGoBack = () => {
    if (webviewRef.current?.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current?.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleOpenExternal = async () => {
    const url = currentUrl || localhostUrl;
    // Use window.open as fallback when not in Electron
    window.open(url, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPort = parseInt(portInput, 10);
    if (parsedPort > 0 && parsedPort <= 65535) {
      setPort(parsedPort);
      setPath('/');
      setLoadError(null);
    }
  };

  const handleReset = () => {
    setPort(null);
    setPortInput('3000');
    setLoadError(null);
  };

  const handleOpenDevTools = () => {
    if (typeof webviewRef.current?.openDevTools === 'function') {
      // Dock devtools at bottom of the webview instead of separate window
      webviewRef.current.openDevTools({ mode: 'bottom' });
    }
  };

  const handleToggleReactGrab = () => {
    setReactGrabEnabled((prev) => !prev);
  };

  // Show port input form if no port is set
  if (!port) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: theme.colors.background,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: theme.colors.backgroundSecondary,
            padding: '32px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <Globe size={32} color={theme.colors.primary} />
            <h2
              style={{
                fontSize: theme.fontSizes[4],
                fontWeight: theme.fontWeights.semibold,
                color: theme.colors.text,
                margin: 0,
              }}
            >
              Localhost Browser
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.fontSizes[1],
                  color: theme.colors.textSecondary,
                  marginBottom: '8px',
                  fontWeight: theme.fontWeights.medium,
                }}
              >
                Port Number
              </label>
              <input
                type="number"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                placeholder="3000"
                min="1"
                max="65535"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: theme.fontSizes[2],
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii[1],
                  color: theme.colors.text,
                  fontFamily: theme.fonts.monospace,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Running servers from context */}
            {runningServers.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: theme.fontSizes[1],
                    color: theme.colors.textSecondary,
                    marginBottom: '8px',
                    fontWeight: theme.fontWeights.medium,
                  }}
                >
                  Running Servers
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {runningServers.map((server) => (
                    <button
                      key={server.port}
                      type="button"
                      onClick={() => {
                        setPort(server.port);
                        setPath('/');
                      }}
                      style={{
                        padding: '12px 16px',
                        fontSize: theme.fontSizes[2],
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii[1],
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: theme.fontWeights.medium }}>
                          {server.label || `localhost:${server.port}`}
                        </span>
                        <span
                          style={{
                            fontSize: theme.fontSizes[1],
                            color: theme.colors.textSecondary,
                            fontFamily: theme.fonts.monospace,
                          }}
                        >
                          :{server.port}
                        </span>
                      </div>
                      {(server.serviceType || server.cwd) && (
                        <div
                          style={{
                            fontSize: theme.fontSizes[0],
                            color: theme.colors.textTertiary,
                            marginTop: '4px',
                            display: 'flex',
                            gap: '8px',
                          }}
                        >
                          {server.serviceType && (
                            <span
                              style={{
                                padding: '2px 6px',
                                backgroundColor: theme.colors.backgroundSecondary,
                                borderRadius: theme.radii[0],
                              }}
                            >
                              {server.serviceType}
                            </span>
                          )}
                          {server.cwd && (
                            <span
                              style={{
                                fontFamily: theme.fonts.monospace,
                                opacity: 0.7,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {server.cwd}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: theme.fontSizes[2],
                fontWeight: theme.fontWeights.semibold,
                backgroundColor: theme.colors.primary,
                color: theme.colors.background,
                border: 'none',
                borderRadius: theme.radii[1],
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Globe size={20} />
              Open
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        flex: 1,
        minHeight: 0,
        boxSizing: 'border-box',
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          backgroundColor: theme.colors.backgroundSecondary,
          borderBottom: `1px solid ${theme.colors.border}`,
          flexShrink: 0,
        }}
      >
        {/* Navigation buttons */}
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          style={{
            padding: '6px',
            backgroundColor: canGoBack
              ? theme.colors.background
              : theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            color: canGoBack ? theme.colors.text : theme.colors.textTertiary,
          }}
          title="Go back"
        >
          <ArrowLeft size={16} />
        </button>

        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          style={{
            padding: '6px',
            backgroundColor: canGoForward
              ? theme.colors.background
              : theme.colors.backgroundSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: canGoForward ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            color: canGoForward ? theme.colors.text : theme.colors.textTertiary,
          }}
          title="Go forward"
        >
          <ArrowRight size={16} />
        </button>

        <button
          onClick={handleReload}
          style={{
            padding: '6px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: theme.colors.text,
          }}
          title="Reload"
        >
          <RefreshCw
            size={16}
            style={isLoading ? { animation: 'spin 1s linear infinite' } : {}}
          />
        </button>

        {/* URL display */}
        <div
          style={{
            flex: 1,
            padding: '6px 12px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            fontSize: theme.fontSizes[1],
            color: theme.colors.textSecondary,
            fontFamily: theme.fonts.monospace,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentUrl || localhostUrl}
        </div>

        {/* Open in external browser */}
        <button
          onClick={handleOpenExternal}
          style={{
            padding: '6px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: theme.colors.text,
          }}
          title="Open in external browser"
        >
          <ExternalLink size={16} />
        </button>

        {/* Open DevTools */}
        <button
          onClick={handleOpenDevTools}
          style={{
            padding: '6px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: theme.colors.text,
          }}
          title="Open DevTools"
        >
          <Bug size={16} />
        </button>

        {/* React Grab toggle */}
        <button
          onClick={handleToggleReactGrab}
          style={{
            padding: '6px',
            backgroundColor: reactGrabEnabled
              ? theme.colors.primary
              : theme.colors.background,
            border: `1px solid ${reactGrabEnabled ? theme.colors.primary : theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: reactGrabEnabled
              ? theme.colors.background
              : theme.colors.text,
          }}
          title={
            reactGrabEnabled
              ? 'Disable React Grab (Cmd+C to select elements)'
              : 'Enable React Grab element inspector'
          }
        >
          <Crosshair size={16} />
        </button>

        {/* Change port button */}
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii[1],
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: theme.colors.text,
            fontSize: theme.fontSizes[1],
            fontWeight: theme.fontWeights.medium,
          }}
          title="Change port"
        >
          Change Port
        </button>
      </div>

      {/* Error display */}
      {loadError && (
        <div
          style={{
            padding: '16px',
            backgroundColor: theme.colors.error + '20',
            borderBottom: `1px solid ${theme.colors.error}`,
            color: theme.colors.error,
            fontSize: theme.fontSizes[2],
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ flex: 1 }}>{loadError}</span>
          <button
            onClick={handleReload}
            style={{
              padding: '6px 12px',
              backgroundColor: theme.colors.error,
              color: 'white',
              border: 'none',
              borderRadius: theme.radii[1],
              cursor: 'pointer',
              fontSize: theme.fontSizes[1],
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Webview container */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <webview
          ref={webviewRef as React.RefObject<WebviewElement>}
          src={localhostUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          // @ts-expect-error - webview attributes not in types
          allowpopups="true"
          webpreferences="contextIsolation=no, nodeIntegration=no, webSecurity=no"
          useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/**
 * LocalhostBrowserPanel - Displays a localhost URL in an embedded webview
 *
 * This panel provides:
 * - An embedded browser for viewing localhost dev servers
 * - Navigation controls (back, forward, reload, home)
 * - Port and path configuration
 * - Quick port selection for common dev servers
 * - Tool integration for programmatic control
 *
 * Note: This component expects the host application to provide a ThemeProvider.
 */
export const LocalhostBrowserPanel: React.FC<PanelComponentProps> =
  LocalhostBrowserPanelContent;
