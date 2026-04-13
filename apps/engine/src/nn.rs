use tract_onnx::prelude::*;
use std::io::Cursor;

// Embed the trained ONNX model directly into the WebAssembly binary.
// This guarantees zero-latency loading when the browser initializes the engine.
const MODEL_BYTES: &[u8] = include_bytes!("../models/idf_brain_single.onnx");

pub struct Brain {
    model: SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>,
}

impl Brain {
    /// Initializes the Neural Network from the embedded bytes
    pub fn new() -> Self {
        let mut cursor = Cursor::new(MODEL_BYTES);
        
        // Load the ONNX model, optimize the math graph for the CPU, and make it runnable
        let model = tract_onnx::onnx()
            .model_for_read(&mut cursor).expect("Failed to read ONNX bytes")
            .into_optimized().expect("Failed to optimize ONNX graph")
            .into_runnable().expect("Failed to make ONNX graph runnable");
            
        Self { model }
    }

    /// Feeds an 81-feature board state into the network and returns (Policy Vector, Win Value)
    pub fn evaluate(&self, state_vector: &[f32; 81]) -> (Vec<f32>, f32) {
        // 1. Convert the raw Rust array into a Tract Tensor of shape [1, 81] (1 batch)
        let tensor = tract_ndarray::Array2::from_shape_vec(
            (1, 81), 
            state_vector.to_vec()
        ).unwrap().into_tensor();

        // 2. Run the tensor through the Neural Network
        let result = self.model.run(tvec!(tensor.into())).expect("Neural Net inference failed");

        // 3. Extract the outputs. 
        // Note: The index order depends on how PyTorch exported it. Usually alphabetical or order of definition.
        // Assuming result[0] is Policy (28 probs) and result[1] is Value (1 win/loss prediction).
        
        let policy_view = result[0].to_array_view::<f32>().unwrap();
        let policy: Vec<f32> = policy_view.iter().copied().collect();

        let value_view = result[1].to_array_view::<f32>().unwrap();
        let value: f32 = *value_view.iter().next().unwrap();

        (policy, value)
    }
}
