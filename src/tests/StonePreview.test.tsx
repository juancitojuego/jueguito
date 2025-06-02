import { render, screen, cleanup } from '@solidjs/testing-library';
import StonePreview from '@src/components/StonePreview';
import { currentStoneDetails, setCurrentStoneDetails } from '@src/store';
import { createStone, StoneQualities } from '@src/stone'; // Import StoneQualities here
import { renderStoneToSVG } from '@src/render.tsx'; // Updated import path

// Mock the actual SVG rendering function to simplify tests if needed,
// or test its integration by checking for <svg> elements.
// For this test, we'll check if renderStoneToSVG is incorporated.
jest.mock('@src/render.tsx', () => { // Updated mock path
  const originalRender = jest.requireActual('@src/render.tsx'); // Updated requireActual path
  return {
    ...originalRender,
    renderStoneToSVG: jest.fn((stone: StoneQualities) => {
      // Return a simple SVG placeholder for testing StonePreview itself
      return <svg data-testid="mock-svg" data-stone-seed={stone.seed}></svg>;
    }),
  };
});

describe('StonePreview Component', () => {
  beforeEach(() => {
    setCurrentStoneDetails(null);
    jest.clearAllMocks(); // Clear mock function calls
  });

  afterEach(cleanup);

  test('should display "No stone selected" when no stone is provided and currentStoneDetails is null', () => {
    render(() => <StonePreview />);
    expect(screen.getByText(/No stone selected to preview/i)).toBeInTheDocument();
  });

  test('should render SVG for currentStoneDetails when no stone prop is provided', () => {
    const testStone = createStone(123);
    setCurrentStoneDetails(testStone);
    render(() => <StonePreview />);
    
    const mockSvgElement = screen.getByTestId('mock-svg');
    expect(mockSvgElement).toBeInTheDocument();
    expect(mockSvgElement).toHaveAttribute('data-stone-seed', testStone.seed.toString());
    expect(renderStoneToSVG).toHaveBeenCalledWith(testStone);
  });

  test('should render SVG for a stone passed via prop, overriding currentStoneDetails', () => {
    const propStone = { ...createStone(456), name: "Prop Rock" };
    const globalStone = createStone(789); // This should be ignored
    setCurrentStoneDetails(globalStone);

    render(() => <StonePreview stone={propStone} />);
    
    const mockSvgElement = screen.getByTestId('mock-svg');
    expect(mockSvgElement).toBeInTheDocument();
    expect(mockSvgElement).toHaveAttribute('data-stone-seed', propStone.seed.toString());
    expect(renderStoneToSVG).toHaveBeenCalledWith(propStone);
    expect(screen.getByText(/Prop Rock/i)).toBeInTheDocument(); // Check if name is displayed
  });

  test('should display title by default or when showTitle is true', () => {
    const testStone = createStone(1);
    setCurrentStoneDetails(testStone);
    render(() => <StonePreview />);
    expect(screen.getByText('Stone Preview')).toBeInTheDocument(); // Default title heading

    cleanup(); // Clean up previous render

    render(() => <StonePreview stone={testStone} showTitle={true} />);
    expect(screen.getByText('Stone Preview')).toBeInTheDocument();
  });

  test('should not display title when showTitle is false', () => {
    const testStone = createStone(1);
    render(() => <StonePreview stone={testStone} showTitle={false} />);
    expect(screen.queryByText('Stone Preview')).not.toBeInTheDocument(); // queryByText for absence
  });

  test('should display stone name and basic info below SVG', () => {
    const stone: StoneQualities = { 
      ...createStone(555), 
      name: "Granite", 
      color: "Grey", 
      shape: "Sphere",
      rarity: 42, 
      // Ensure all required StoneQualities fields are present or satisfy createStone's output
      // Hardness, magic, weight, createdAt are from createStone(555)
    };

    render(() => <StonePreview stone={stone} />);
    expect(screen.getByText(/Granite/i)).toBeInTheDocument();
    expect(screen.getByText(/Grey Sphere/i)).toBeInTheDocument();
    expect(screen.getByText(/Rarity: 42/i)).toBeInTheDocument();
  });
});
