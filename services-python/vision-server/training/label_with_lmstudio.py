"""
Auto-labeling pipeline using LM Studio with vision models.

Uses LM Studio's OpenAI-compatible API to run vision models locally.
This provides a free alternative to Claude Vision API.

Recommended Models for LM Studio:
- llama-3.2-vision (11B) - Best balance of speed/quality
- llava-v1.6-mistral-7b - Fast, good quality
- bakllava-1-7b - Optimized LLaVA variant
- cogvlm2-llama3-chat-19b - High quality (requires more VRAM)

LM Studio Setup:
1. Download LM Studio from https://lmstudio.ai/
2. Download a vision model (search for "vision" or "llava")
3. Load the model in LM Studio
4. Start the local server (default: http://127.0.0.1:1234)

Cost: $0 (runs locally)
Performance: Depends on hardware (RTX 3090 Ti: ~2-5 images/sec)
"""

import os
import json
import base64
from pathlib import Path
from typing import Dict, List, Optional
import argparse
from tqdm import tqdm
from openai import OpenAI

try:
    from .taxonomy import TAXONOMY
except ImportError:
    # Handle running as script
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from training.taxonomy import TAXONOMY


# Classification prompt for vision models
CLASSIFICATION_PROMPT = """Analyze this real estate property image and classify it according to the following taxonomy. Return a JSON object with your classifications.

**Classification Categories:**

1. **room_type** (single-label): Choose ONE primary room type:
   - Options: kitchen, bathroom, bedroom, living_room, dining_room, office, garage, laundry, hallway, closet, basement, attic, patio, pool, exterior_front, exterior_back, aerial

2. **flooring** (multi-label): List ALL visible flooring materials (can be multiple):
   - Options: hardwood, laminate, tile_ceramic, tile_porcelain, natural_stone, marble, vinyl_plank, carpet, concrete, brick, terrazzo

3. **countertop** (single-label): If visible, choose ONE countertop material:
   - Options: granite, marble, quartz, quartzite, butcher_block, laminate, concrete, soapstone, stainless_steel, tile
   - Use "none" if no countertop is visible

4. **design_style** (multi-label): List ALL applicable design styles:
   - Options: modern, contemporary, traditional, farmhouse, mid_century, industrial, coastal, mediterranean, craftsman, minimalist, bohemian, art_deco, transitional

5. **fixtures** (multi-label): List ALL visible fixtures and architectural details:
   - Options: pendant_lights, recessed_lighting, chandelier, sconces, track_lighting, stainless_appliances, black_appliances, white_appliances, freestanding_tub, walk_in_shower, double_vanity, crown_molding, wainscoting, shiplap, exposed_beams

6. **materials** (multi-label): List ALL visible structural/exterior materials:
   - Options: brick, stone, stucco, wood_siding, vinyl_siding, metal, glass, concrete, cedar_shake

7. **condition** (single-label): Assess overall property condition:
   - Options: excellent, good, fair, needs_renovation, new_construction

**Response format (JSON only, no explanation):**
```json
{
  "room_type": "kitchen",
  "flooring": ["hardwood", "tile_ceramic"],
  "countertop": "granite",
  "design_style": ["modern", "transitional"],
  "fixtures": ["pendant_lights", "stainless_appliances", "recessed_lighting"],
  "materials": ["glass"],
  "condition": "excellent",
  "confidence": 0.95,
  "notes": "Brief description if needed"
}
```

Respond with ONLY the JSON object, no other text."""


def encode_image(image_path: Path) -> str:
    """Encode image to base64 string."""
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def get_image_media_type(image_path: Path) -> str:
    """Determine image media type from extension."""
    ext = image_path.suffix.lower()
    type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    return type_map.get(ext, 'image/jpeg')


def classify_image_with_lmstudio(
    client: OpenAI,
    image_path: Path,
    model: str = "llama-3.2-vision",
    max_tokens: int = 1024
) -> Optional[Dict]:
    """
    Send image to LM Studio for classification.
    
    Args:
        client: OpenAI client configured for LM Studio
        image_path: Path to image file
        model: Model name (as shown in LM Studio)
        max_tokens: Maximum tokens for response
    
    Returns:
        Dictionary with classification results or None if error
    """
    try:
        # Encode image
        image_data = encode_image(image_path)
        media_type = get_image_media_type(image_path)
        
        # Create messages with vision content
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": CLASSIFICATION_PROMPT
                    }
                ]
            }
        ]
        
        # Call LM Studio API
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,  # Low temperature for more consistent outputs
        )
        
        # Parse response
        response_text = response.choices[0].message.content
        
        # Extract JSON from response
        # LM Studio models might wrap it in markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Try to find JSON object in the response
        # Some models might add text before/after the JSON
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        
        if start_idx != -1 and end_idx > start_idx:
            response_text = response_text[start_idx:end_idx]
        
        result = json.loads(response_text)
        
        # Validate against taxonomy
        validated = validate_classification(result)
        
        return validated
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error for {image_path}: {e}")
        print(f"Response text: {response_text[:200]}...")
        return None
    except Exception as e:
        print(f"Error classifying {image_path}: {e}")
        return None


def validate_classification(result: Dict) -> Dict:
    """Validate classification results against taxonomy."""
    validated = {
        "image_path": result.get("image_path", ""),
        "confidence": result.get("confidence", 0.0),
        "notes": result.get("notes", "")
    }
    
    for head_name, head in TAXONOMY.items():
        if head_name not in result:
            continue
        
        value = result[head_name]
        
        if head.head_type == "single-label":
            # Validate single-label classification
            if value in head.classes:
                validated[head_name] = value
            elif value == "none":
                validated[head_name] = None
            else:
                print(f"Warning: Invalid class '{value}' for {head_name}")
                validated[head_name] = None
        else:
            # Validate multi-label classification
            if isinstance(value, list):
                valid_classes = [v for v in value if v in head.classes]
                validated[head_name] = valid_classes
            else:
                validated[head_name] = []
    
    return validated


def test_lmstudio_connection(base_url: str = "http://127.0.0.1:1234/v1") -> bool:
    """Test connection to LM Studio server."""
    try:
        client = OpenAI(base_url=base_url, api_key="lm-studio")
        
        # Try to list models
        models = client.models.list()
        model_names = [model.id for model in models.data]
        
        print(f"✓ Connected to LM Studio at {base_url}")
        print(f"✓ Available models: {', '.join(model_names)}")
        
        # Check if any vision models are loaded
        vision_keywords = ['vision', 'llava', 'bakllava', 'cogvlm']
        vision_models = [m for m in model_names if any(kw in m.lower() for kw in vision_keywords)]
        
        if vision_models:
            print(f"✓ Vision models found: {', '.join(vision_models)}")
            return True
        else:
            print("⚠ No vision models detected. Please load a vision model in LM Studio.")
            print("  Recommended: llama-3.2-vision, llava-v1.6-mistral-7b, bakllava-1-7b")
            return False
            
    except Exception as e:
        print(f"✗ Could not connect to LM Studio at {base_url}")
        print(f"  Error: {e}")
        print("\nMake sure:")
        print("  1. LM Studio is running")
        print("  2. Local server is started (Server tab)")
        print("  3. A vision model is loaded")
        return False


def load_progress(output_dir: Path) -> set:
    """Load already processed images from previous runs."""
    progress_file = output_dir / "progress.txt"
    processed = set()
    
    if progress_file.exists():
        with open(progress_file, 'r') as f:
            processed = set(line.strip() for line in f if line.strip())
        print(f"✓ Loaded progress: {len(processed)} images already labeled")
    
    return processed


def save_progress(output_dir: Path, image_path: str):
    """Save progress incrementally."""
    progress_file = output_dir / "progress.txt"
    with open(progress_file, 'a') as f:
        f.write(f"{image_path}\n")


def process_images(
    input_dir: Path,
    output_dir: Path,
    base_url: str = "http://127.0.0.1:1234/v1",
    model: str = "llama-3.2-vision",
    batch_size: int = 100,
    confidence_threshold: float = 0.8,
    max_images: Optional[int] = None,
    resume: bool = True
):
    """
    Process all images in input directory and save labeled results.
    
    Args:
        input_dir: Input directory with unlabeled images
        output_dir: Output directory for labeled results
        base_url: LM Studio API base URL
        model: Model name (use model ID from LM Studio)
        batch_size: Batch size for saving results
        confidence_threshold: Minimum confidence threshold
        max_images: Maximum number of images to process (None = all)
        resume: Resume from previous run (skip already processed images)
    """
    # Test connection first
    if not test_lmstudio_connection(base_url):
        print("\n✗ Cannot proceed without LM Studio connection")
        return
    
    # Initialize client
    client = OpenAI(base_url=base_url, api_key="lm-studio")
    
    # Load progress from previous runs
    processed_images = load_progress(output_dir) if resume else set()
    
    # Find all images
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    image_paths = []
    for ext in image_extensions:
        image_paths.extend(input_dir.rglob(f"*{ext}"))
    
    # Filter out already processed images
    if resume and processed_images:
        image_paths = [p for p in image_paths if str(p) not in processed_images]
        print(f"✓ Resuming: {len(image_paths)} images remaining")
    
    if max_images:
        image_paths = image_paths[:max_images]
    
    print(f"\n{'='*60}")
    print(f"Found {len(image_paths)} images to process")
    print(f"Model: {model}")
    print(f"Confidence threshold: {confidence_threshold}")
    print(f"{'='*60}\n")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    labeled_dir = output_dir / "images"
    labeled_dir.mkdir(exist_ok=True)
    
    # Process images
    results = []
    skipped = 0
    errors = 0
    
    for image_path in tqdm(image_paths, desc="Labeling images"):
        # Classify with LM Studio
        classification = classify_image_with_lmstudio(client, image_path, model)
        
        if classification is None:
            errors += 1
            continue
        
        # Filter by confidence
        if classification.get("confidence", 0) < confidence_threshold:
            skipped += 1
            continue
        
        # Add image path
        classification["image_path"] = str(image_path.relative_to(input_dir))
        
        # Copy image to labeled directory
        dest_path = labeled_dir / image_path.name
        import shutil
        shutil.copy2(image_path, dest_path)
        classification["labeled_image_path"] = str(dest_path.relative_to(output_dir))
        
        results.append(classification)
        
        # Save progress
        save_progress(output_dir, str(image_path))
        
        # Save batch
        if len(results) % batch_size == 0:
            save_results(results, output_dir / "labels.jsonl")
    
    # Final save
    save_results(results, output_dir / "labels.jsonl")
    
    # Save metadata
    metadata = {
        "total_processed": len(image_paths),
        "total_labeled": len(results),
        "skipped_low_confidence": skipped,
        "errors": errors,
        "confidence_threshold": confidence_threshold,
        "model": model,
        "base_url": base_url
    }
    
    with open(output_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✓ Successfully labeled {len(results)} images")
    print(f"✗ Skipped {skipped} images (low confidence)")
    print(f"✗ Errors: {errors} images")
    print(f"✓ Results saved to: {output_dir / 'labels.jsonl'}")
    print(f"{'='*60}")


def save_results(results: List[Dict], output_path: Path):
    """Save results to JSONL file."""
    with open(output_path, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')


def main():
    parser = argparse.ArgumentParser(description="Auto-label images with LM Studio")
    parser.add_argument("--input", type=str, default="./data/raw",
                       help="Input directory with unlabeled images")
    parser.add_argument("--output", type=str, default="./data/labeled",
                       help="Output directory for labeled results")
    parser.add_argument("--base-url", type=str, default="http://127.0.0.1:1234/v1",
                       help="LM Studio API base URL")
    parser.add_argument("--model", type=str, default="llama-3.2-vision",
                       help="Model name (as shown in LM Studio)")
    parser.add_argument("--confidence", type=float, default=0.8,
                       help="Minimum confidence threshold")
    parser.add_argument("--batch-size", type=int, default=100,
                       help="Batch size for saving results")
    parser.add_argument("--max-images", type=int, default=None,
                       help="Maximum number of images to process (e.g., 100 for testing)")
    parser.add_argument("--no-resume", action="store_true",
                       help="Start fresh (don't resume from previous run)")
    parser.add_argument("--test-connection", action="store_true",
                       help="Test connection to LM Studio and exit")
    
    args = parser.parse_args()
    
    # Test connection mode
    if args.test_connection:
        test_lmstudio_connection(args.base_url)
        return
    
    input_dir = Path(args.input)
    output_dir = Path(args.output)
    
    if not input_dir.exists():
        raise ValueError(f"Input directory not found: {input_dir}")
    
    print("=" * 60)
    print("LM Studio Auto-Labeling Pipeline")
    print("=" * 60)
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Model: {args.model}")
    print(f"API: {args.base_url}")
    print(f"Confidence threshold: {args.confidence}")
    print("=" * 60)
    
    process_images(
        input_dir=input_dir,
        output_dir=output_dir,
        base_url=args.base_url,
        model=args.model,
        confidence_threshold=args.confidence,
        batch_size=args.batch_size,
        max_images=args.max_images,
        resume=not args.no_resume
    )


if __name__ == "__main__":
    main()
