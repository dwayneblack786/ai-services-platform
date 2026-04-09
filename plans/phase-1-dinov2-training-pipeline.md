# Phase 1: DINOv2 Training Pipeline (Weeks 1-4)

## Context

Part of the PropVision AI project — a computer vision system for real estate property attribute classification. This phase focuses solely on building the local training pipeline to fine-tune DINOv2 for classifying flooring, countertops, design styles, fixtures, materials, room types, and condition from listing photos.

**Parent plan:** `.claude/plans/curried-bouncing-dolphin.md` (full PropVision AI plan covering all 5 phases)

**Decisions:**
- **Hardware**: NVIDIA RTX 3090 Ti (24GB VRAM) — ViT-B/14 at batch 64, no constraints
- **Dataset**: Acquire from open sources (MIT Indoor Scenes, Open Images V7, HuggingFace datasets)
- **Auto-labeling**: Claude Vision API (Haiku) for ~$15 per 20K images
- **Base model**: DINOv2 ViT-B/14 (86M params, 768-dim embeddings)
- **Pattern to follow**: `services-python/whisper-server/` for project structure

---

## 1.1 Create `services-python/vision-server/` directory

```
vision-server/
├── server.py                  # Flask inference (mirrors whisper-server pattern) — built in Phase 2
├── requirements.txt           # torch, torchvision, flask, flask-cors, anthropic
├── start-vision.ps1
├── training/
│   ├── taxonomy.py            # Classification categories + label definitions
│   ├── download_data.py       # Automated dataset acquisition
│   ├── label_with_claude.py   # Claude Vision API auto-labeling pipeline
│   ├── dataset.py             # PyTorch Dataset class + data loaders
│   ├── model.py               # DINOv2 backbone + multi-head classifier
│   ├── train.py               # Training loop with logging
│   ├── evaluate.py            # Metrics, confusion matrices
│   ├── export_onnx.py         # ONNX export for faster inference
│   └── config.yaml            # Hyperparameters
├── models/                    # Saved checkpoints
├── data/
│   ├── raw/                   # Source images
│   ├── labeled/               # JSONL + images after Claude labeling
│   └── splits/                # train/val/test
└── proto/
    └── vision.proto           # gRPC service definition (used in Phase 2)
```

---

## 1.2 Classification Taxonomy (taxonomy.py)

7 classification heads:

| Head | Type | Classes |
|------|------|---------|
| **room_type** | single-label (17) | kitchen, bathroom, bedroom, living_room, dining_room, office, garage, laundry, hallway, closet, basement, attic, patio, pool, exterior_front, exterior_back, aerial |
| **flooring** | multi-label (11) | hardwood, laminate, tile_ceramic, tile_porcelain, natural_stone, marble, vinyl_plank, carpet, concrete, brick, terrazzo |
| **countertop** | single-label (10) | granite, marble, quartz, quartzite, butcher_block, laminate, concrete, soapstone, stainless_steel, tile |
| **design_style** | multi-label (13) | modern, contemporary, traditional, farmhouse, mid_century, industrial, coastal, mediterranean, craftsman, minimalist, bohemian, art_deco, transitional |
| **fixtures** | multi-label (15) | pendant_lights, recessed_lighting, chandelier, sconces, track_lighting, stainless_appliances, black_appliances, white_appliances, freestanding_tub, walk_in_shower, double_vanity, crown_molding, wainscoting, shiplap, exposed_beams |
| **materials** | multi-label (9) | brick, stone, stucco, wood_siding, vinyl_siding, metal, glass, concrete, cedar_shake |
| **condition** | single-label (5) | excellent, good, fair, needs_renovation, new_construction |

---

## 1.3 Dataset Acquisition (download_data.py)

Since we need to acquire data, the pipeline includes an automated download/scraping step.

**Open datasets (free, immediate):**
- **MIT Indoor Scenes** — 15,620 images across 67 indoor categories (download via torchvision or direct)
- **Open Images V7** — filter for "kitchen", "bathroom", "living room", "bedroom" categories (~50K+ relevant images)
- **HuggingFace Hub** — search for "real estate", "interior design", "room type" datasets
- **SUN397** — 108K images including many indoor/architectural scenes

**Supplemental (if needed):**
- Bing Image Search API for "granite countertop kitchen", "hardwood floor living room", etc. (~$3/1K searches)
- Unsplash API (free, high-quality interior photos with permissive license)

**Target: 20K images minimum**, balanced across room types.

---

## 1.4 Auto-Labeling with Claude Vision (label_with_claude.py)

- Send each image to Claude Haiku with vision — classify per taxonomy, return structured JSON
- Cost: ~$15 with Haiku for 20K images, ~$100 with Sonnet for higher quality
- Filter to confidence > 0.8 only; human-review 5% random sample
- Store as JSONL: `{"image_path": "...", "room_type": "kitchen", "flooring": ["hardwood"], ...}`
- Split 80/10/10 stratified by room_type

---

## 1.5 Model Architecture (model.py)

```python
class RealEstateClassifier(nn.Module):
    def __init__(self):
        self.backbone = torch.hub.load('facebookresearch/dinov2', 'dinov2_vitb14')
        # Freeze backbone initially
        for param in self.backbone.parameters():
            param.requires_grad = False

        embed_dim = 768  # ViT-B/14
        # 7 classification heads with shared architecture
        self.heads = nn.ModuleDict({
            'room_type': nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 17)),
            'flooring':  nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 11)),
            'countertop': nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 10)),
            'design_style': nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 13)),
            'fixtures': nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 15)),
            'materials': nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 9)),
            'condition': nn.Sequential(Linear(768, 256), ReLU(), Dropout(0.3), Linear(256, 5)),
        })
```

- **ViT-B/14** (86M params, 768-dim embeddings) — fits easily on RTX 3090 Ti with batch 64
- Training Step 1: frozen backbone, train heads only (~10 hours)
- Training Step 2: unfreeze last 3 transformer blocks, fine-tune at 10x lower LR (~8 hours)
- Loss: CrossEntropyLoss for single-label heads, BCEWithLogitsLoss for multi-label heads

---

## 1.6 Training Config (config.yaml)

```yaml
model:
  backbone: dinov2_vitb14
  freeze_backbone: true
  unfreeze_last_n_blocks: 0   # Set to 3 for Step 2 fine-tuning

training:
  batch_size: 64
  learning_rate: 0.001
  weight_decay: 0.01
  epochs: 30
  scheduler: cosine_annealing
  warmup_epochs: 3
  early_stopping_patience: 5

data:
  image_size: 518              # DINOv2 native resolution
  augmentations:
    - random_horizontal_flip
    - random_rotation_10deg
    - color_jitter_brightness_0.2
    - color_jitter_contrast_0.2
    - random_resized_crop_0.8_1.0

inference:
  confidence_threshold: 0.5
  top_k: 3
```

- Batch size: 64, LR: 0.001, cosine annealing, 30 epochs, early stopping patience 5
- Image size: 518px (DINOv2 native)
- Augmentations: horizontal flip, rotation 10deg, color jitter, random resized crop

---

## Critical Files

| File | Action |
|------|--------|
| `services-python/vision-server/requirements.txt` | **Create** — torch, torchvision, flask, flask-cors, anthropic, Pillow, scikit-learn |
| `services-python/vision-server/training/taxonomy.py` | **Create** — classification head definitions |
| `services-python/vision-server/training/download_data.py` | **Create** — automated dataset acquisition |
| `services-python/vision-server/training/label_with_claude.py` | **Create** — Claude Vision auto-labeling |
| `services-python/vision-server/training/dataset.py` | **Create** — PyTorch Dataset + DataLoader |
| `services-python/vision-server/training/model.py` | **Create** — DINOv2 backbone + 7 classification heads |
| `services-python/vision-server/training/train.py` | **Create** — training loop |
| `services-python/vision-server/training/evaluate.py` | **Create** — metrics + confusion matrices |
| `services-python/vision-server/training/export_onnx.py` | **Create** — ONNX export |
| `services-python/vision-server/training/config.yaml` | **Create** — hyperparameters |

## Existing Patterns to Reuse

- `services-python/whisper-server/server.py` — Flask + PyTorch + base64 I/O pattern (project structure reference)
- `services-python/whisper-server/requirements.txt` — dependency format reference

---

## Verification

1. **Setup**: `python -c "import torch; print(torch.cuda.is_available())"` returns `True`
2. **Dataset**: Run `download_data.py` — verify 20K+ images in `data/raw/`
3. **Labeling**: Run `label_with_claude.py` on 100-image sample — verify JSONL output with correct taxonomy fields
4. **Training Step 1**: Run `train.py` with frozen backbone — verify loss decreases, val accuracy >85% on room_type after 30 epochs
5. **Training Step 2**: Run `train.py` with `unfreeze_last_n_blocks: 3` — verify additional 3-8% accuracy improvement
6. **Evaluation**: Run `evaluate.py` — verify per-head F1 scores, generate confusion matrices
7. **Model save**: Verify checkpoint saved to `models/realestate_classifier_v1.pt`
