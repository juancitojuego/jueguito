import { render, screen, cleanup } from '@solidjs/testing-library';
import ConsoleLog from '@src/components/ConsoleLog';
import { consoleLogMessages, setConsoleLogMessages } from '@src/store'; // To control messages

describe('ConsoleLog Component', () => {
  beforeEach(() => {
    // Reset messages before each test
    setConsoleLogMessages([]);
  });

  afterEach(cleanup);

  test('should render "Console Log:" heading', () => {
    render(() => <ConsoleLog />);
    expect(screen.getByText('Console Log:')).toBeInTheDocument();
  });

  test('should display messages from consoleLogMessages signal', () => {
    const messages = ['[10:00:00] Test message 1', '[10:00:01] Another message'];
    setConsoleLogMessages(messages);
    render(() => <ConsoleLog />);
    expect(screen.getByText(messages[0])).toBeInTheDocument();
    expect(screen.getByText(messages[1])).toBeInTheDocument();
  });

  test('should display new messages when consoleLogMessages signal updates', () => {
    render(() => <ConsoleLog />);
    expect(screen.queryByText(/Initial Test/i)).not.toBeInTheDocument();

    setConsoleLogMessages(prev => [...prev, '[10:00:02] Initial Test']);
    expect(screen.getByText('[10:00:02] Initial Test')).toBeInTheDocument();

    setConsoleLogMessages(prev => [...prev, '[10:00:03] Subsequent Test']);
    expect(screen.getByText('[10:00:03] Subsequent Test')).toBeInTheDocument();
  });

  test('should scroll to bottom (conceptual test - actual scroll behavior is hard to unit test)', () => {
    // This test is more about ensuring the component structure for scrolling is there.
    // Actual scroll behavior testing is better suited for e2e tests.
    const messages = Array.from({ length: 10 }, (_, i) => `Message ${i + 1}`);
    setConsoleLogMessages(messages);
    const { container } = render(() => <ConsoleLog />);
    const scrollableDiv = container.querySelector('div[style*="overflow-y: auto"]');
    expect(scrollableDiv).toBeInTheDocument();
    // In a real browser, we could check scrollDiv.scrollTop and scrollDiv.scrollHeight
    // but JSDOM doesn't fully implement layout/scrolling.
    // We trust that SolidJS effect for scrolling is correctly set up.
  });
});
