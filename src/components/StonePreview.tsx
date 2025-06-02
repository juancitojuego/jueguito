import { Component, Show, JSX } from 'solid-js';
import { currentStoneDetails } from '../store'; 
import { StoneQualities } from '../stone';      // Ensuring StoneQualities is from ../stone
import { renderStoneToSVG } from '../render'; // Ensuring import is from '../render'

interface StonePreviewProps {
  stone?: StoneQualities | null; 
  showTitle?: boolean;
}

const StonePreview: Component<StonePreviewProps> = (props) => {
  const stoneAccessor = () => props.stone !== undefined ? props.stone : currentStoneDetails();
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
          when={stoneAccessor()}
          fallback={<p>No stone selected to preview.</p>}
        >
          {(s) => { // s is an accessor
            const stoneObj = s() as StoneQualities | null; // Explicitly get the object & cast
            if (!stoneObj) return null; 
            // Now use stoneObj which TypeScript should recognize as StoneQualities
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
