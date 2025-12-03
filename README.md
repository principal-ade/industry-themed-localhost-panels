# Localhost Browser Panel

An embedded browser panel for viewing localhost development servers in Electron applications. Part of the `@principal-ade` panel framework.

## Features

- **Embedded Webview**: View localhost dev servers (React, Vite, Storybook, etc.) directly in your Electron app
- **Quick Port Selection**: One-click selection for common development ports (3000, 5173, 8080, 6006, etc.)
- **Full Navigation**: Back, forward, reload, and home navigation controls
- **External Browser**: Open the current URL in your default browser
- **Tool Integration**: UTCP-compatible tools for AI agent control

## Installation

```bash
bun add @industry-theme/localhost-panels
# or
npm install @industry-theme/localhost-panels
```

## Usage

### In a Panel Host Application

```tsx
import { panels } from '@industry-theme/localhost-panels';

// Register panels with your panel registry
panelRegistry.registerPackage(panels);
```

### Electron Configuration

The webview functionality requires specific Electron configuration. See `ELECTRON_WEBVIEW_NOTES.md` for details.

**Required `webPreferences`:**

```typescript
webPreferences: {
  webviewTag: true,
}
```

**CSP Configuration:**

Localhost URLs must be excluded from CSP or have appropriate `frame-src` directives:

```typescript
// Exclude localhost from CSP
if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
  callback({ responseHeaders: details.responseHeaders });
  return;
}
```

## Available Tools

The panel exposes these UTCP-compatible tools for AI agent integration:

| Tool | Description |
|------|-------------|
| `navigate_to_localhost` | Navigate to a specific port and path |
| `reload_localhost_page` | Reload the current page |
| `localhost_go_back` | Navigate back in history |
| `localhost_go_forward` | Navigate forward in history |

### Tool Examples

```typescript
// Navigate to Storybook
events.emit({
  type: 'principal-ade.localhost-browser:navigate',
  payload: { port: 6006, path: '/' }
});

// Reload the page
events.emit({
  type: 'principal-ade.localhost-browser:reload'
});
```

## Development

```bash
# Install dependencies
bun install

# Start Storybook for development
bun run storybook

# Build for production
bun run build

# Type checking
bun run typecheck
```

## Common Ports

| Port | Server |
|------|--------|
| 3000 | React / Next.js |
| 5173 | Vite |
| 8080 | Webpack |
| 6006 | Storybook |
| 4200 | Angular |
| 8000 | Python / Django |

## Storybook Notes

If Storybook shows "Loading..." indefinitely when viewed through the webview:

1. Disable `crossOriginIsolated` in `.storybook/main.ts`:
   ```typescript
   core: {
     crossOriginIsolated: false,
   }
   ```

2. Ensure no `Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy` headers are being sent

## License

MIT
