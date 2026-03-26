"""
Auto-labeling pipeline using Claude Vision API.

Processes images through Claude Haiku with vision capabilities to generate
structured labels for all 7 classification heads.

Cost estimate: ~$15 for 20K images with Claude Haiku
"""

import os
import json
import base64
from pathlib import Path
from typing import Dict, List, Optional
import argparse
from tqdm import tqdm
from anthropic import Anthropic

from .taxonomy import TAXONOMY


# Claude Vision prompt for property classification
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


def classify_image_with_claude(
    client: Anthropic,
    image_path: Path,
    model: str = "claude-3-haiku-20240307"
) -> Optional[Dict]:
    """
    Send image to Claude Vision API for classification.
    
    Returns:
        Dictionary with classification results or None if error
    """
    try:
        # Encode image
        image_data = encode_image(image_path)
        media_type = get_image_media_type(image_path)
        
        # Call Claude API
        message = client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": CLASSIFICATION_PROMPT
                        }
                    ],
                }
            ],
        )
        
        # Parse response
        response_text = message.content[0].text
        
        # Extract JSON from response
        # Claude might wrap it in markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(response_text)
        
        # Validate against taxonomy
        validated = validate_classification(result)
        
        return validated
        
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


def process_images(
    input_dir: Path,
    output_dir: Path,
    api_key: str,
    model: str = "claude-3-haiku-20240307",
    batch_size: int = 100,
    confidence_threshold: float = 0.8
):
    """
    Process all images in input directory and save labeled results.
    """
    # Initialize Claude client
    client = Anthropic(api_key=api_key)
    
    # Find all images
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    image_paths = []
    for ext in image_extensions:
        image_paths.extend(input_dir.rglob(f"*{ext}"))
    
    print(f"Found {len(image_paths)} images to process")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    labeled_dir = output_dir / "images"
    labeled_dir.mkdir(exist_ok=True)
    
    # Process images
    results = []
    skipped = 0
    
    for image_path in tqdm(image_paths, desc="Labeling images"):
        # Classify with Claude
        classification = classify_image_with_claude(client, image_path, model)
        
        if classification is None:
            skipped += 1
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
        
        # Save batch
        if len(results) % batch_size == 0:
            save_results(results, output_dir / "labels.jsonl")
    
    # Final save
    save_results(results, output_dir / "labels.jsonl")
    
    # Save metadata
    metadata = {
        "total_processed": len(image_paths),
        "total_labeled": len(results),
        "skipped": skipped,
        "confidence_threshold": confidence_threshold,
        "model": model
    }
    
    with open(output_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✓ Labeled {len(results)} images")
    print(f"✗ Skipped {skipped} images (low confidence or errors)")
    print(f"✓ Results saved to: {output_dir / 'labels.jsonl'}")


def save_results(results: List[Dict], output_path: Path):
    """Save results to JSONL file."""
    with open(output_path, 'w') as f:
        for result in results:
            f.write(json.dumps(result) + '\n')


def main():
    parser = argparse.ArgumentParser(description="Auto-label images with Claude Vision API")
    parser.add_argument("--input", type=str, default="./data/raw",
                       help="Input directory with unlabeled images")
    parser.add_argument("--output", type=str, default="./data/labeled",
                       help="Output directory for labeled results")
    parser.add_argument("--model", type=str, default="claude-3-haiku-20240307",
                       choices=["claude-3-haiku-20240307", "claude-3-sonnet-20240229"],
                       help="Claude model to use")
    parser.add_argument("--confidence", type=float, default=0.8,
                       help="Minimum confidence threshold")
    parser.add_argument("--batch-size", type=int, default=100,
                       help="Batch size for saving results")
    
    args = parser.parse_args()
    
    # Get API key from environment
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    input_dir = Path(args.input)
    output_dir = Path(args.output)
    
    if not input_dir.exists():
        raise ValueError(f"Input directory not found: {input_dir}")
    
    print("=" * 60)
    print("Claude Vision Auto-Labeling Pipeline")
    print("=" * 60)
    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Model: {args.model}")
    print(f"Confidence threshold: {args.confidence}")
    print("=" * 60)
    
    process_images(
        input_dir=input_dir,
        output_dir=output_dir,
        api_key=api_key,
        model=args.model,
        confidence_threshold=args.confidence,
        batch_size=args.batch_size
    )


if __name__ == "__main__":
    main()
