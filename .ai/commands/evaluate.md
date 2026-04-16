Evaluate the trained PropVision DINOv2 model.

Steps:
1. Run evaluation: `cd services-python/vision-server && python training/evaluate.py`
2. Report per-head metrics:
   - Accuracy, precision, recall, F1 for each of the 7 classification heads (room_type, flooring, countertop, design_style, fixtures, materials, condition)
   - Confusion matrices for single-label heads
   - Top misclassifications per head
3. If $ARGUMENTS contains a path to a specific checkpoint, evaluate that checkpoint instead of the default best model
4. Compare against the baseline if a previous evaluation exists in models/eval_history.json
5. Summarize: which heads are production-ready (>90% F1) and which need more data or tuning
