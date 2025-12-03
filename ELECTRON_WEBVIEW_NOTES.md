# Electron Webview Integration Notes

This document covers the configuration required for the LocalhostBrowserPanel to work correctly when embedded in an Electron app.

## Problem Summary

The LocalhostBrowserPanel uses an Electron `<webview>` tag to display localhost dev servers (like Storybook). Several configuration issues can prevent localhost content from loading.

## Required Electron Configuration

### 1. Enable Webview Tag

In the main window's `webPreferences`:

```typescript
webPreferences: {
  webviewTag: true,
}
```

### 2. CSP Must Exclude Localhost

The electron app's Content Security Policy interceptor must **not** apply CSP headers to localhost URLs. Otherwise, `frame-ancestors 'none'` will block the webview from displaying localhost content.

```typescript
// In setupContentSecurityPolicy()
this.window.webContents.session.webRequest.onHeadersReceived(
  (details, callback) => {
    const url = new URL(details.url);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      // Let localhost servers control their own CSP
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    // Apply CSP to other URLs...
  }
);
```

### 3. Frame-src Directive (if CSP is applied)

If you do apply CSP, ensure `frame-src` allows localhost:

```
frame-src http://localhost:* https://localhost:*;
```

Without this, `default-src 'self'` blocks frames from localhost.

## Webview Element Configuration

The webview element needs these attributes:

```tsx
<webview
  src={localhostUrl}
  allowpopups="true"  // String, not boolean (React warning)
  webpreferences="contextIsolation=no, nodeIntegration=no, webSecurity=no"
  useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
/>
```

- `allowpopups="true"` - Must be string to avoid React DOM warning
- `webSecurity=no` - Allows cross-origin communication within the webview (needed for Storybook's manager/preview iframe communication)

## Storybook-Specific Notes

If Storybook shows "Loading..." indefinitely:

1. Check that `crossOriginIsolated` is not enabled in `.storybook/main.ts`:
   ```typescript
   core: {
     crossOriginIsolated: false,
   }
   ```

2. Verify no `Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy` headers are being sent (these block embedding)

3. Storybook's manager UI loads a preview iframe - both need to load without CSP restrictions

## Debugging

Enable console logging in the webview by listening to events:

- `did-fail-load` - Shows error codes and descriptions
- `console-message` - Captures console output from webview content
- Check for CSP violations in the error message (look for "frame-ancestors")
