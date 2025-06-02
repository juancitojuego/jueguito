// src/index.ts
import { render } from 'solid-js/web';
import App from './App';
// If you create a global stylesheet, e.g., index.css or App.css, import it here.
// import './index.css';

// The store is initialized (including calling loadData()) when it's first imported.
// App.tsx or other components will import from store.ts, triggering initialization.

const root = document.getElementById('root');

if (!root) {
  throw new Error(
    'Fatal Error: Root element not found in index.html. The SolidJS application cannot be mounted. Ensure an element with id="root" exists in your HTML body.'
  );
}

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  // This specific check for HTMLElement might be redundant given the !root check,
  // but it's good practice for type safety in dev.
  throw new Error(
    'Root element not found or is not an HTMLElement. Ensure your index.html has <div id="root"></div> (or similar) in the body.',
  );
}

render(() => <App />, root!);

// Remove old blessed-related code, main function, and other terminal-specific logic.
// The new entry point is solely for bootstrapping the SolidJS application.
// All game logic, UI, and state management are now handled within SolidJS components and stores.
// Utility functions like logMessage, showMessage, PRNG, stone creation etc.,
// are now in src/utils.ts, src/store.ts, and src/stone.ts respectively.
