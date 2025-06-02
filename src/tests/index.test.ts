// src/tests/index.test.tsx (renamed to .tsx for safety with JSX, though not strictly needed for this simple test)
import { render, screen, cleanup } from '@solidjs/testing-library';
// Import other necessary SolidJS testing utilities if needed

// Mock document.getElementById for the root element
// This is crucial because src/index.ts expects to find it.
let mockRootElement: HTMLElement | null;

describe('Application Entry Point (src/index.ts)', () => {
  beforeEach(() => {
    // Create a mock root element before each test
    mockRootElement = document.createElement('div');
    mockRootElement.setAttribute('id', 'root');
    document.body.appendChild(mockRootElement);
    jest.resetModules(); // Important to reset modules to re-run src/index.ts
  });

  afterEach(() => {
    // Clean up the mock root element and any rendered content
    if (mockRootElement) {
      document.body.removeChild(mockRootElement);
    }
    mockRootElement = null;
    cleanup(); // Cleans up Solid's testing library rendered components
  });

  test('should run without immediate errors and attempt to render into #root', () => {
    let errorThrown = false;
    try {
      // Dynamically import to execute the script in the test context
      // after the mock root is set up.
      require('@src/index'); 
    } catch (e) {
      errorThrown = true;
      console.error("Error during src/index.ts execution in test:", e);
    }
    expect(errorThrown).toBe(false);
    
    // Check if App.tsx content (e.g., the main header) is rendered.
    // This assumes App.tsx renders something identifiable.
    // The text "Stone Crafter - SolidJS Edition" is in App.tsx's header.
    // This requires App.tsx and its dependencies to be testable.
    // If App.tsx has complex side effects (like heavy store init not mocked), this might fail.
    // For a true unit test of index.ts, you might mock App.tsx itself.
    // However, for this project, seeing if it mounts is a good smoke test.
    expect(screen.getByText(/Stone Crafter - SolidJS Edition/i)).toBeInTheDocument();
  });

  test('should throw error if root element is not found', () => {
    // Remove the root element to simulate it not being there
    if (mockRootElement) {
      document.body.removeChild(mockRootElement);
    }

    expect(() => {
      require('@src/index');
    }).toThrow(/Fatal Error: Root element not found/);
  });
});
