# Auto-Labeling Quick Start: LM Studio vs Claude

## 🆓 LM Studio (Recommended - Free & Local)

### Prerequisites
- LM Studio installed
- Vision model downloaded (llama-3.2-vision, llava, bakllava)
- GPU with 8-24GB VRAM

### Setup (5 minutes)
```powershell
# 1. Install openai package (already done)
pip install openai

# 2. Test LM Studio connection
python test_lmstudio.py
```

### Usage
```powershell
# Label all images
python training/label_with_lmstudio.py --input data/raw --output data/labeled

# Test with 100 images first
python training/label_with_lmstudio.py --input data/raw --output data/labeled --max-images 100
```

### Recommended Models

| Model | Download Size | VRAM | Speed | Quality |
|-------|---------------|------|-------|---------|
| **llava-v1.6-34b** 🏆 | ~20GB | 20-24GB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **llama-3.2-vision-11b** | ~7GB | 12GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **llava-v1.6-mistral-7b** | ~4GB | 8GB | ⭐⭐⭐⭐⚡ | ⭐⭐⭐⭐ |
| **bakllava-1-7b** | ~4GB | 8GB | ⭐⭐⭐⭐⚡ | ⭐⭐⭐⭐ |

🏆 = Best for RTX 3090 Ti (24GB VRAM)

---

## 💰 Claude Vision API (Cloud, Paid)

### Prerequisites
- Anthropic API key
- Internet connection

### Setup (2 minutes)
```powershell
# Set API key
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

### Usage
```powershell
# Label all images
python training/label_with_claude.py --input data/raw --output data/labeled

# Use Sonnet for higher quality (10x cost)
python training/label_with_claude.py --model claude-3-sonnet-20240229
```

### Cost Estimates
- **Haiku**: ~$0.00075/image → $15 for 20K images
- **Sonnet**: ~$0.005/image → $100 for 20K images

---

## Comparison Matrix

| Feature | LM Studio | Claude Haiku | Claude Sonnet |
|---------|-----------|--------------|---------------|
| **Cost** | 💚 Free | 💛 ~$15/20K | 🟡 ~$100/20K |
| **Speed** | ⚡ 2-5 img/s | ⚡⚡ 10-15 img/s | ⚡ 5-8 img/s |
| **Quality** | 85-90% | 90-95% | 92-97% |
| **Privacy** | 💚 Fully local | 🔴 Cloud | 🔴 Cloud |
| **Hardware** | GPU needed | None | None |
| **Setup time** | 15 min | 2 min | 2 min |
| **Offline** | ✅ Yes | ❌ No | ❌ No |

---

## Recommended Workflow

### 1. Start with LM Studio (Free Test)
```powershell
# Process 500 images to test quality
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled_test \
    --max-images 500 \
    --confidence 0.85
```

### 2. Review Quality
```powershell
# Check metadata
Get-Content data/labeled_test/metadata.json

# Manually review 20-30 random samples
# Check if classifications match images
```

### 3. Choose Final Approach

**If LM Studio quality is good (>85%):**
```powershell
# Process all 20K images (takes 1-2 hours)
python training/label_with_lmstudio.py \
    --input data/raw \
    --output data/labeled \
    --confidence 0.85
```

**If you need higher quality:**
```powershell
# Use Claude Haiku for all images
$env:ANTHROPIC_API_KEY = "sk-ant-..."
python training/label_with_claude.py \
    --input data/raw \
    --output data/labeled
```

---

## Troubleshooting

### LM Studio Issues

**Can't connect?**
```powershell
# Test connection
python test_lmstudio.py

# Verify LM Studio server is running
# Check http://127.0.0.1:1234/v1/models in browser
```

**No vision models?**
- Download a model with "vision" or "llava" in the name
- Load it in LM Studio before starting server

**JSON parsing errors?**
- Try a different model (llama-3.2-vision is most reliable)
- Lower `--confidence` threshold to 0.7

### Claude Issues

**API key not working?**
```powershell
# Verify key is set
echo $env:ANTHROPIC_API_KEY

# Test with curl
curl https://api.anthropic.com/v1/messages `
  -H "x-api-key: $env:ANTHROPIC_API_KEY" `
  -H "anthropic-version: 2023-06-01"
```

---

## Next Steps After Labeling

1. **Split dataset:**
   ```powershell
   python training/dataset.py --labels data/labeled/labels.jsonl
   ```

2. **Start training:**
   ```powershell
   python training/train.py
   ```

3. **Evaluate results:**
   ```powershell
   python training/evaluate.py --checkpoint models/best_model.pt
   ```

---

## Performance Tips

### LM Studio Optimization
- Use Q4 or Q5 quantized models for speed
- Enable GPU acceleration in Settings
- Close other GPU applications
- Use smaller batch size if running out of memory

### Claude Optimization
- Use Haiku for cost efficiency (quality still good)
- Batch process during off-peak hours
- Set higher confidence threshold to reduce API calls
- Cache results to avoid re-processing

---

📖 **Full LM Studio guide:** [LM_STUDIO_LABELING_GUIDE.md](LM_STUDIO_LABELING_GUIDE.md)
