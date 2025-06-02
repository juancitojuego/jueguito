import { Component, Show, JSX } from 'solid-js';
import { currentStoneDetails, StoneQualities } from '../store'; // Adjust path as needed
import { renderStoneToSVG } from '../render'; // Import the new SVG renderer

interface StonePreviewProps {
  stone?: StoneQualities | null;
  showTitle?: boolean;
}

const StonePreview: Component<StonePreviewProps> = (props) => {
  const stoneToDisplay = () => props.stone !== undefined ? props.stone : currentStoneDetails();
  const shouldShowTitle = () => props.showTitle === undefined ? true : props.showTitle;

  const previewContainerStyle: JSX.CSSProperties = {
    padding: '10px',
    border: '1px solid #ccc', // Changed from dashed for a more finished look
    "min-height": '200px', // Increased min-height for SVG
    display: 'flex',
    "flex-direction": 'column',
    "align-items": 'center',
    "justify-content": 'center',
    "background-color": "#f9f9f9", // Light background for the preview box
    gap: '10px', // Add some gap if displaying text and SVG
  };

  const svgWrapperStyle: JSX.CSSProperties = {
    width: '150px', // Fixed width for the SVG wrapper
    height: '150px', // Fixed height for the SVG wrapper
    display: 'inline-block', // Allows it to sit nicely if there's text around
  };


  return (
    <div>
      <Show when={shouldShowTitle()}>
        <h3 style={{"text-align":"center"}}>Stone Preview</h3>
      </Show>
      <div style={previewContainerStyle}>
        <Show
          when={stoneToDisplay()}
          fallback={<p>No stone selected to preview.</p>}
        >
          {(stone) => ( // stone is guaranteed non-null here
            <>
              <div style={svgWrapperStyle}>
                {renderStoneToSVG(stone)}
              </div>
              {/* Optional: Display some key info below the SVG if needed */}
              <div style={{"text-align": "center", "font-size": "0.9em"}}>
                <p><strong>{stone.name || `Stone ${stone.seed}`}</strong></p>
                <p>{stone.color} {stone.shape}</p>
                <p>Rarity: {stone.rarity}</p>
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  );
};

export default StonePreview;
