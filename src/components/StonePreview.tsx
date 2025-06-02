import { Component, Show, JSX } from 'solid-js';
import { equippedStoneDetails } from '../store'; // Changed to equippedStoneDetails
import { StoneQualities } from '../stone';
import { renderStoneToSVG } from '../render';

interface StonePreviewProps {
  stone?: StoneQualities | null;
  showTitle?: boolean;
}

const StonePreview: Component<StonePreviewProps> = (props) => {
  // If a stone is passed as a prop, use it; otherwise, use the globally equipped stone.
  const stoneToDisplay = () => props.stone !== undefined ? props.stone : equippedStoneDetails();
  const shouldShowTitle = () => props.showTitle === undefined ? true : props.showTitle;

  const previewContainerStyle: JSX.CSSProperties = {
    padding: '10px',
    border: '1px solid #ccc', 
    "min-height": '200px', 
    display: 'flex',
    "flex-direction": 'column',
    "align-items": 'center',
    "justify-content": 'center',
    "background-color": "#f9f9f9", 
    gap: '10px', 
  };

  const svgWrapperStyle: JSX.CSSProperties = {
    width: '150px', 
    height: '150px', 
    display: 'inline-block', 
  };

  return (
    <div>
      <Show when={shouldShowTitle()}>
        <h3 style={{"text-align":"center"}}>Stone Preview</h3>
      </Show>
      <div style={previewContainerStyle}>
        <Show
          when={stoneToDisplay()} // Use the new stoneToDisplay accessor
          fallback={<p>No stone selected to preview.</p>}
        >
          {(stone) => { // stone is now the direct StoneQualities object (or null, handled by Show)
            // No need to call stone() if Show unwraps it.
            // If props.stone can be an accessor, then stone() would be needed.
            // Assuming props.stone is a direct object or null/undefined.
            // And equippedStoneDetails is also direct object or null.
            // Solid's <Show> provides the unwrapped value.
            if (!stone) return null; 
            return (
            <>
              <div style={svgWrapperStyle}>
                {renderStoneToSVG(stoneObj)}
              </div>
              <div style={{"text-align": "center", "font-size": "0.9em"}}>
                <p><strong>{stoneObj.name || `Stone ${stoneObj.seed}`}</strong></p>
                <p>{stoneObj.color} {stoneObj.shape}</p>
                <p>Rarity: {stoneObj.rarity}</p>
              </div>
            </>
            );
          }}
        </Show>
      </div>
    </div>
  );
};

export default StonePreview;
