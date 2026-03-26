# Label Review and Validation Guide

Complete guide for validating label quality and correcting errors.

## Quick Start

### 1. Start with 100 Images

```powershell
# Label first 100 images with LM Studio
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --max-images 100
```

### 2. Validate Quality

```powershell
# Check label quality and get statistics
python training/validate_labels.py \
    --labels data/labeled/labels.jsonl \
    --plot \
    --suggest-review 20
```

This generates:
- Distribution statistics for each classification head
- Warnings for potential issues (imbalanced data, low confidence)
- Distribution plots saved to `validation/`
- List of 20 images recommended for manual review

### 3. Manual Review (GUI)

```powershell
# Review and correct labels using GUI
python review_labels.py --labels data/labeled/labels.jsonl

# Or review only suggested images
python review_labels.py \
    --labels data/labeled/labels.jsonl \
    --input validation/review_list.txt
```

**GUI Features:**
- ✓ View images with predicted labels
- ✓ Edit labels using dropdowns/checkboxes
- ✓ Navigate with arrow keys or buttons
- ✓ Mark images for further review
- ✓ Save corrections
- ✓ Track progress

**Keyboard Shortcuts:**
- `←/→` - Previous/Next image
- `Enter` - Accept and next
- `Space` - Next image

### 4. Continue Labeling

```powershell
# Resume and label more images (automatically skips already labeled)
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --max-images 500
```

The script automatically resumes from where it left off using `progress.txt`.

---

## Tracking Progress

### Automatic Resume

The labeling script tracks progress in `data/labeled/progress.txt`:
- Each labeled image path is saved
- On restart, already labeled images are skipped
- You can stop/restart at any time

### Check Status

```powershell
# See how many images are labeled
Get-Content data/labeled/metadata.json

# See progress list
Get-Content data/labeled/progress.txt | Measure-Object -Line
```

### Start Fresh

```powershell
# Ignore previous progress and start over
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled_new \
    --no-resume
```

---

## Validation Workflow

### Expected Output (validation)

```
============================================================
Label Quality Validation Report
============================================================

📊 Overview:
  Total images: 100

======================================================================
ROOM_TYPE (single-label)
======================================================================
  Missing labels: 2 (2.0%)
  Avg confidence: 0.893

  Top 5 classes:
    kitchen             : 35 (35.0%) ████████████████
    living_room         : 22 (22.0%) ██████████
    bedroom             : 18 (18.0%) ████████
    bathroom            : 15 (15.0%) ███████
    dining_room         : 8  (8.0%)  ████

======================================================================
⚠️  WARNINGS
======================================================================
  ⚠️  flooring: 15.0% missing labels
  ⚠️  countertop: Low average confidence (0.68)
```

### What to Look For

**Good Signs:**
- ✓ Confidence > 0.8
- ✓ Balanced distribution (no single class > 60%)
- ✓ Few missing labels (< 5%)
- ✓ Logical class combinations (e.g., kitchens have countertops)

**Warning Signs:**
- ⚠️ Low confidence (< 0.7)
- ⚠️ One class dominates (> 60%)
- ⚠️ Many missing labels (> 10%)
- ⚠️ All images classified as same style/condition

### Quality Metrics

**Target Accuracy:**
- llava-v1.6-34b: 87-92%
- llama-3.2-vision: 85-90%
- llava-v1.6-mistral: 80-85%

**Acceptable Error Rates:**
- Room type: < 5% errors
- Flooring/Materials: < 15% errors (harder to classify)
- Design style: < 20% errors (subjective)
- Condition: < 10% errors

---

## GUI Review Tool

### Features

**View & Edit:**
- Image display with zoom
- All 7 classification heads
- Dropdowns for single-label (e.g., room_type)
- Checkboxes for multi-label (e.g., flooring, design_style)

**Navigation:**
- Previous/Next buttons
- Keyboard shortcuts
- Progress indicator (23/100)

**Actions:**
- **Accept** - Current labels are correct, move to next
- **Mark for Review** - Flag for further attention
- **Save All** - Export corrected labels

**Status Tracking:**
- Shows reviewed count
- Shows correction count
- Highlights low-confidence images

### Typical Review Session

```powershell
# 1. Review 50 suggested images
python review_labels.py \
    --labels data/labeled/labels.jsonl \
    --input validation/review_list.txt

# 2. Corrected labels saved to: data/labeled/labels_corrected.jsonl

# 3. Replace original labels (optional)
Move-Item data/labeled/labels.jsonl data/labeled/labels_backup.jsonl
Move-Item data/labeled/labels_corrected.jsonl data/labeled/labels.jsonl
```

---

## Complete Workflow Example

### Day 1: Initial Test (2 hours)

```powershell
# 1. Label 100 images
python training/label_with_lmstudio.py --max-images 100

# 2. Validate quality
python training/validate_labels.py --labels data/labeled/labels.jsonl --plot

# 3. Review 20 suggested images
python review_labels.py --labels data/labeled/labels.jsonl --input validation/review_list.txt

# 4. Check if quality is acceptable (>85% accuracy)
#    If yes: continue to Day 2
#    If no: adjust model or confidence threshold
```

### Day 2: Full Labeling (2-4 hours)

```powershell
# 1. Label remaining images (resumes automatically)
python training/label_with_lmstudio.py --max-images 20000

# 2. Final validation
python training/validate_labels.py --labels data/labeled/labels.jsonl --plot --suggest-review 100

# 3. Review 5% sample (~100 images)
python review_labels.py --labels data/labeled/labels.jsonl --input validation/review_list.txt

# 4. Replace with corrected labels if needed
```

### Day 3: Training

```powershell
# 1. Split dataset
python training/dataset.py --labels data/labeled/labels.jsonl

# 2. Start training
python training/train.py
```

---

## Retraining After Corrections

### Option 1: Incremental Fix

```powershell
# 1. Review and correct problematic images
python review_labels.py --labels data/labeled/labels.jsonl --input validation/review_list.txt

# 2. Re-split dataset with corrected labels
python training/dataset.py --labels data/labeled/labels_corrected.jsonl

# 3. Continue training from checkpoint
python training/train.py --resume models/checkpoint_epoch_10.pt
```

### Option 2: Re-label Specific Categories

```powershell
# If one classification head performs poorly, you can:

# 1. Filter images with low confidence for that head
python training/validate_labels.py --labels data/labeled/labels.jsonl

# 2. Re-label with higher confidence threshold
python training/label_with_lmstudio.py \
    --confidence 0.9 \
    --max-images 1000

# 3. Merge with existing labels (manual process or script)
```

---

## Tips for Best Results

### Labeling Quality

**Improve accuracy:**
- Use larger model (llava-v1.6-34b > mistral-7b)
- Increase confidence threshold (0.85 instead of 0.8)
- Review low-confidence predictions
- Manually review 5-10% random sample

**Speed up labeling:**
- Use Q4 quantized models
- Lower confidence threshold (0.75)
- Process in batches (1000 at a time)
- Run overnight for large datasets

### Validation Best Practices

1. **Always validate first 100 images** before labeling all 20K
2. **Check distribution plots** for obvious issues
3. **Review suggested samples** - prioritize low-confidence
4. **Sample across different room types** for balanced review
5. **Track corrections** - if > 20% need correction, re-evaluate model

### GUI Review Efficiency

- Use keyboard shortcuts (faster than mouse)
- Focus on low-confidence images first
- Don't aim for 100% perfection (90%+ is excellent)
- Mark unclear images instead of guessing
- Review in sessions (50-100 images per session)

---

## Troubleshooting

### "Most images are kitchen - is this right?"

Check your dataset source. MIT Indoor Scenes has many kitchens. If imbalanced:
- Download more diverse datasets
- Filter source data before labeling
- Use stratified sampling for training

### "Low confidence on all images"

- Model may not be suited for this task
- Try larger/different model
- Check image quality (blur, darkness)
- Review prompt in label_with_lmstudio.py

### "GUI won't start"

```powershell
# Install tkinter support
pip install pillow tk
```

### "Can't find images in GUI"

Verify `--images-root` path or let it auto-detect:
```powershell
python review_labels.py \
    --labels data/labeled/labels.jsonl \
    --images-root data/labeled/images
```

---

## Next Steps

After validation and review:

1. ✓ Split dataset: `python training/dataset.py`
2. ✓ Train model: `python training/train.py`
3. ✓ Evaluate: `python training/evaluate.py`
4. ✓ Export ONNX: `python training/export_onnx.py`

---

*For more details, see main documentation and training guides.*
