// Dynamically import the WASM module
import init, { analyze_board_state } from '../../../../engine/pkg/ida_engine';

let isEngineInitialized = false;

export const queryOracle = async (boardStateJson: string) => {
  try {
    // 1. Boot up the WebAssembly VM if it hasn't started yet
    if (!isEngineInitialized) {
      console.log("Booting IDA Rust Engine...");
      await init(); 
      isEngineInitialized = true;
      console.log("Engine Online. Neural Network Loaded.");
    }

    // 2. Start a highly precise timer
    const startTime = performance.now();

    // 3. Fire the data into Rust/C-level execution
    const resultString = analyze_board_state(boardStateJson);

    // 4. Stop the timer and parse the result
    const endTime = performance.now();
    const result = JSON.parse(resultString);

    console.log(`[ORACLE] Analyzed ${result.depth.toLocaleString()} universes in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[ORACLE] Best Move: [${result.best_move[0]}, ${result.best_move[1]}] | Win Prob: ${(result.win_probability * 100).toFixed(1)}%`);

    return result;

  } catch (error) {
    console.error("Engine failure:", error);
    return null;
  }
};
