Run Claude Vision auto-labeling on a batch of images for the PropVision training dataset.

Steps:
1. Check how many unlabeled images exist: count files in `services-python/vision-server/data/raw/` that don't have a corresponding entry in `data/labeled/labels.jsonl`
2. If $ARGUMENTS specifies a number (e.g., "500"), label that many images. Default: 100
3. Run labeling: `cd services-python/vision-server && python training/label_with_claude.py --batch-size <N>`
4. Report:
   - Images labeled successfully
   - Images skipped (low confidence < 0.8)
   - Cost estimate (tokens used)
   - Label distribution across room types
5. Run a quick quality check: sample 5 random labeled images and display the labels for manual verification
