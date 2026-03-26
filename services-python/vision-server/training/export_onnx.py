"""
Export DINOv2 model to ONNX format for optimized inference.

ONNX provides:
- Hardware acceleration support
- Deployment flexibility
- Optimized inference speed
"""

import argparse
import yaml
from pathlib import Path
import torch
import onnx
import onnxruntime as ort
from .model import create_model


def export_to_onnx(
    model: torch.nn.Module,
    output_path: Path,
    image_size: int = 518,
    opset_version: int = 17
):
    """
    Export PyTorch model to ONNX format.
    
    Args:
        model: PyTorch model to export
        output_path: Path to save ONNX model
        image_size: Input image size
        opset_version: ONNX opset version
    """
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randn(1, 3, image_size, image_size)
    
    # Export
    print(f"Exporting model to ONNX (opset {opset_version})...")
    
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=['images'],
        output_names=[head_name for head_name in model.taxonomy.keys()],
        dynamic_axes={
            'images': {0: 'batch_size'},
            **{head_name: {0: 'batch_size'} for head_name in model.taxonomy.keys()}
        }
    )
    
    print(f"✓ ONNX model exported: {output_path}")
    
    # Verify ONNX model
    print("\nVerifying ONNX model...")
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("✓ ONNX model is valid")
    
    # Print model info
    print(f"\nModel info:")
    print(f"  IR version: {onnx_model.ir_version}")
    print(f"  Producer: {onnx_model.producer_name}")
    print(f"  Opset version: {opset_version}")
    print(f"\nInputs:")
    for input_tensor in onnx_model.graph.input:
        print(f"  - {input_tensor.name}: {[d.dim_value for d in input_tensor.type.tensor_type.shape.dim]}")
    print(f"\nOutputs:")
    for output_tensor in onnx_model.graph.output:
        print(f"  - {output_tensor.name}")


def test_onnx_inference(onnx_path: Path, image_size: int = 518):
    """Test ONNX model inference."""
    print("\nTesting ONNX inference...")
    
    # Create ONNX Runtime session
    session = ort.InferenceSession(str(onnx_path))
    
    # Get input/output names
    input_name = session.get_inputs()[0].name
    output_names = [output.name for output in session.get_outputs()]
    
    # Create dummy input
    dummy_input = torch.randn(1, 3, image_size, image_size).numpy()
    
    # Run inference
    outputs = session.run(output_names, {input_name: dummy_input})
    
    print("✓ ONNX inference successful")
    print(f"\nOutput shapes:")
    for name, output in zip(output_names, outputs):
        print(f"  {name}: {output.shape}")


def compare_pytorch_onnx(
    pytorch_model: torch.nn.Module,
    onnx_path: Path,
    image_size: int = 518
):
    """Compare outputs between PyTorch and ONNX models."""
    print("\nComparing PyTorch vs ONNX outputs...")
    
    pytorch_model.eval()
    
    # Create test input
    test_input = torch.randn(1, 3, image_size, image_size)
    
    # PyTorch inference
    with torch.no_grad():
        pytorch_outputs = pytorch_model(test_input)
    
    # ONNX inference
    session = ort.InferenceSession(str(onnx_path))
    input_name = session.get_inputs()[0].name
    output_names = [output.name for output in session.get_outputs()]
    
    onnx_outputs = session.run(output_names, {input_name: test_input.numpy()})
    
    # Compare outputs
    print("\nOutput differences:")
    max_diff = 0.0
    
    for head_name, pytorch_output in pytorch_outputs.items():
        onnx_output = None
        for i, name in enumerate(output_names):
            if name == head_name:
                onnx_output = onnx_outputs[i]
                break
        
        if onnx_output is not None:
            diff = torch.abs(pytorch_output - torch.from_numpy(onnx_output)).max().item()
            print(f"  {head_name}: max diff = {diff:.6e}")
            max_diff = max(max_diff, diff)
    
    if max_diff < 1e-5:
        print(f"\n✓ PyTorch and ONNX outputs match (max diff: {max_diff:.6e})")
    else:
        print(f"\n⚠ Large difference detected (max diff: {max_diff:.6e})")


def main():
    parser = argparse.ArgumentParser(description="Export model to ONNX")
    parser.add_argument("--config", type=str, default="training/config.yaml",
                       help="Path to config file")
    parser.add_argument("--checkpoint", type=str, required=True,
                       help="Path to PyTorch checkpoint")
    parser.add_argument("--output", type=str, default=None,
                       help="Output ONNX file path (default: same as checkpoint with .onnx extension)")
    parser.add_argument("--opset", type=int, default=17,
                       help="ONNX opset version")
    parser.add_argument("--test", action="store_true",
                       help="Run inference test after export")
    parser.add_argument("--compare", action="store_true",
                       help="Compare PyTorch vs ONNX outputs")
    
    args = parser.parse_args()
    
    # Load config
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Determine output path
    if args.output is None:
        checkpoint_path = Path(args.checkpoint)
        output_path = checkpoint_path.with_suffix('.onnx')
    else:
        output_path = Path(args.output)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("ONNX Model Export")
    print("=" * 60)
    print(f"Checkpoint: {args.checkpoint}")
    print(f"Output: {output_path}")
    print(f"Opset: {args.opset}")
    print("=" * 60)
    
    # Load model
    print("\nLoading PyTorch model...")
    model = create_model(config)
    
    checkpoint = torch.load(args.checkpoint, map_location='cpu')
    if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)
    
    print("✓ Model loaded")
    
    # Export to ONNX
    image_size = config["data"]["image_size"]
    export_to_onnx(model, output_path, image_size, args.opset)
    
    # Test inference
    if args.test:
        test_onnx_inference(output_path, image_size)
    
    # Compare outputs
    if args.compare:
        compare_pytorch_onnx(model, output_path, image_size)
    
    print("\n" + "=" * 60)
    print("Export complete!")
    print("=" * 60)
    print(f"\nONNX model saved to: {output_path}")
    print(f"Model size: {output_path.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
