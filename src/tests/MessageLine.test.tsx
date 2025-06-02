import { render, screen, cleanup } from '@solidjs/testing-library'; // Removed act
import MessageLine from '@src/components/MessageLine';
import { currentMessage, setCurrentMessage, Message } from '@src/store'; // To control the message

describe('MessageLine Component', () => {
  beforeEach(() => {
    // Reset message before each test
    setCurrentMessage(null);
    jest.useFakeTimers(); // Use fake timers for testing timeout logic if showMessage uses it
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers(); // Clear any pending timers
    jest.useRealTimers(); // Restore real timers
  });

  test('should render nothing when currentMessage is null', () => {
    const { container } = render(() => <MessageLine />);
    // Expect the component to render essentially empty or a hidden placeholder
    // For a component that conditionally renders based on a signal, its container might still exist.
    // Check if any text content is rendered.
    expect(container.textContent).toBe('');
  });

  test('should display the message text when currentMessage is set', () => {
    const testMessage: Message = { text: 'Hello Test!', type: 'info' };
    setCurrentMessage(testMessage);
    render(() => <MessageLine />);
    expect(screen.getByText('Hello Test!')).toBeInTheDocument();
  });

  test('should apply style based on message type (info)', () => {
    const testMessage: Message = { text: 'Info message', type: 'info' };
    setCurrentMessage(testMessage);
    render(() => <MessageLine />);
    const messageDiv = screen.getByText('Info message');
    expect(messageDiv).toHaveStyle('background-color: lightblue');
  });

  test('should apply style based on message type (error)', () => {
    const testMessage: Message = { text: 'Error message', type: 'error' };
    setCurrentMessage(testMessage);
    render(() => <MessageLine />);
    const messageDiv = screen.getByText('Error message');
    expect(messageDiv).toHaveStyle('background-color: lightcoral');
  });

  test('should apply style based on message type (success)', () => {
    const testMessage: Message = { text: 'Success message', type: 'success' };
    setCurrentMessage(testMessage);
    render(() => <MessageLine />);
    const messageDiv = screen.getByText('Success message');
    expect(messageDiv).toHaveStyle('background-color: lightgreen');
  });

  test('should clear the message if showMessage utility handles timeout (conceptual)', () => {
    // This test assumes that showMessage utility (not part of MessageLine component itself)
    // would set currentMessage to null after a duration.
    // MessageLine itself just renders the currentMessage.
    const testMessage: Message = { text: 'Temporary Message', type: 'info', duration: 1000 };
    
    // Simulate showMessage behavior
    setCurrentMessage(testMessage); 
    render(() => <MessageLine />);
    expect(screen.getByText('Temporary Message')).toBeInTheDocument();

    // Fast-forward time if showMessage from utils.ts (which sets currentMessage) uses setTimeout
    // For this component test, we'd manually clear it to see if it disappears    
    // Advance timers if showMessage or another utility that sets currentMessage uses setTimeout
    jest.advanceTimersByTime(1000); 
    // To test MessageLine's reaction, we manually update the signal that it listens to.
    // If showMessage utility itself were being tested, its effect on setCurrentMessage(null) would be asserted.
    setCurrentMessage(null); 
    expect(screen.queryByText('Temporary Message')).not.toBeInTheDocument();
  });
});
