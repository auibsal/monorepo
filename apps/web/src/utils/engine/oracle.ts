// Dynamically import the WASM module
import init, { analyze_board_state } from '../../../../engine/pkg/idf_engine';

let isEngineInitialized = false;

export const queryOracle = async (gameStateJson: string) => {
  if (!isEngineInitialized) {
    await init(); // Boot up the WebAssembly VM in the browser
    isEngineInitialized = true;
  }

  // Pass the data to Rust, which calculates at native C-level speeds
  const analysisResultString = analyze_board_state(gameStateJson);
  
  // Parse the result back into a JavaScript object for the UI
  return JSON.parse(analysisResultString);
};
