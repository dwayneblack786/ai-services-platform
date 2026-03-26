"""
GUI tool for reviewing and correcting labels.

Features:
- View images with their predicted labels
- Edit/correct labels
- Navigate through images
- Save corrections
- Export corrected dataset

Usage:
    python review_labels.py --labels data/labeled/labels.jsonl
    python review_labels.py --input validation/review_list.txt
"""

import json
import tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path
from typing import Dict, List, Optional
import argparse
from PIL import Image, ImageTk

try:
    from .taxonomy import TAXONOMY
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from training.taxonomy import TAXONOMY


class LabelReviewGUI:
    def __init__(self, root, labels: List[Dict], images_root: Path, output_path: Path):
        self.root = root
        self.root.title("Label Review Tool")
        self.root.geometry("1400x900")
        
        self.labels = labels
        self.images_root = images_root
        self.output_path = output_path
        self.current_index = 0
        self.corrections = {}  # Track corrections
        
        self.setup_ui()
        self.load_image(self.current_index)
    
    def setup_ui(self):
        """Setup the user interface."""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(0, weight=1)
        
        # Left panel: Image display
        left_panel = ttk.Frame(main_frame)
        left_panel.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Image canvas
        self.canvas = tk.Canvas(left_panel, width=800, height=600, bg='gray')
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Navigation buttons
        nav_frame = ttk.Frame(left_panel)
        nav_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(nav_frame, text="◀ Previous", command=self.prev_image).pack(side=tk.LEFT, padx=5)
        self.progress_label = ttk.Label(nav_frame, text="")
        self.progress_label.pack(side=tk.LEFT, expand=True)
        ttk.Button(nav_frame, text="Next ▶", command=self.next_image).pack(side=tk.LEFT, padx=5)
        
        # Right panel: Labels
        right_panel = ttk.Frame(main_frame, padding="10")
        right_panel.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Image info
        info_frame = ttk.LabelFrame(right_panel, text="Image Info", padding="10")
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.image_name_label = ttk.Label(info_frame, text="", wraplength=400)
        self.image_name_label.pack(anchor=tk.W)
        
        self.confidence_label = ttk.Label(info_frame, text="", wraplength=400)
        self.confidence_label.pack(anchor=tk.W)
        
        # Scrollable labels frame
        canvas_frame = ttk.Frame(right_panel)
        canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        labels_canvas = tk.Canvas(canvas_frame)
        scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical", command=labels_canvas.yview)
        self.labels_frame = ttk.Frame(labels_canvas)
        
        self.labels_frame.bind(
            "<Configure>",
            lambda e: labels_canvas.configure(scrollregion=labels_canvas.bbox("all"))
        )
        
        labels_canvas.create_window((0, 0), window=self.labels_frame, anchor="nw")
        labels_canvas.configure(yscrollcommand=scrollbar.set)
        
        labels_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Action buttons
        action_frame = ttk.Frame(right_panel)
        action_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(action_frame, text="✓ Accept", command=self.accept_label).pack(side=tk.LEFT, padx=5)
        ttk.Button(action_frame, text="✗ Mark for Review", command=self.mark_for_review).pack(side=tk.LEFT, padx=5)
        ttk.Button(action_frame, text="💾 Save All", command=self.save_corrections).pack(side=tk.LEFT, padx=5)
        
        # Status bar
        self.status_label = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN)
        self.status_label.grid(row=1, column=0, sticky=(tk.W, tk.E))
        
        # Keyboard bindings
        self.root.bind('<Left>', lambda e: self.prev_image())
        self.root.bind('<Right>', lambda e: self.next_image())
        self.root.bind('<Return>', lambda e: self.accept_label())
        self.root.bind('<space>', lambda e: self.next_image())
    
    def load_image(self, index: int):
        """Load and display image with labels."""
        if index < 0 or index >= len(self.labels):
            return
        
        self.current_index = index
        label_data = self.labels[index]
        
        # Update progress
        self.progress_label.config(text=f"{index + 1} / {len(self.labels)}")
        
        # Load and display image
        image_path = self.images_root / label_data.get("labeled_image_path", label_data.get("image_path", ""))
        
        if image_path.exists():
            img = Image.open(image_path)
            
            # Resize to fit canvas
            canvas_width = self.canvas.winfo_width() or 800
            canvas_height = self.canvas.winfo_height() or 600
            
            img.thumbnail((canvas_width - 20, canvas_height - 20), Image.Resampling.LANCZOS)
            
            self.photo = ImageTk.PhotoImage(img)
            self.canvas.delete("all")
            self.canvas.create_image(canvas_width // 2, canvas_height // 2, image=self.photo)
            
            # Update info
            self.image_name_label.config(text=f"File: {image_path.name}")
            confidence = label_data.get("confidence", 0.0)
            conf_color = "green" if confidence > 0.85 else "orange" if confidence > 0.7 else "red"
            self.confidence_label.config(text=f"Confidence: {confidence:.2f}", foreground=conf_color)
        else:
            self.canvas.delete("all")
            self.canvas.create_text(400, 300, text="Image not found", fill="white", font=("Arial", 16))
        
        # Display labels
        self.display_labels(label_data)
        
        # Update status
        reviewed = sum(1 for i in range(index + 1) if i in self.corrections)
        self.status_label.config(text=f"Reviewed: {reviewed}/{len(self.labels)} | Corrections: {len([c for c in self.corrections.values() if c.get('modified')])}")
    
    def display_labels(self, label_data: Dict):
        """Display labels in the right panel."""
        # Clear existing widgets
        for widget in self.labels_frame.winfo_children():
            widget.destroy()
        
        self.label_vars = {}
        
        for head_name, head_config in TAXONOMY.items():
            frame = ttk.LabelFrame(self.labels_frame, text=f"{head_name} ({head_config.head_type})", padding="5")
            frame.pack(fill=tk.X, pady=5)
            
            current_value = label_data.get(head_name)
            
            if head_config.head_type == "single-label":
                # Dropdown for single-label
                var = tk.StringVar(value=current_value if current_value else "")
                self.label_vars[head_name] = var
                
                combo = ttk.Combobox(frame, textvariable=var, values=head_config.classes, state="readonly", width=30)
                combo.pack(fill=tk.X)
                
            else:  # multi-label
                # Check boxes for multi-label
                current_values = current_value if isinstance(current_value, list) else []
                vars_dict = {}
                
                for class_name in head_config.classes:
                    var = tk.BooleanVar(value=class_name in current_values)
                    vars_dict[class_name] = var
                    
                    cb = ttk.Checkbutton(frame, text=class_name, variable=var)
                    cb.pack(anchor=tk.W)
                
                self.label_vars[head_name] = vars_dict
    
    def get_current_labels(self) -> Dict:
        """Get current label values from UI."""
        labels = {}
        
        for head_name, head_config in TAXONOMY.items():
            if head_config.head_type == "single-label":
                labels[head_name] = self.label_vars[head_name].get()
            else:  # multi-label
                labels[head_name] = [
                    class_name for class_name, var in self.label_vars[head_name].items()
                    if var.get()
                ]
        
        return labels
    
    def prev_image(self):
        """Go to previous image."""
        if self.current_index > 0:
            self.load_image(self.current_index - 1)
    
    def next_image(self):
        """Go to next image."""
        if self.current_index < len(self.labels) - 1:
            self.load_image(self.current_index + 1)
    
    def accept_label(self):
        """Accept current labels and move to next."""
        current_labels = self.get_current_labels()
        original_labels = self.labels[self.current_index]
        
        # Check if modified
        modified = False
        for head_name in TAXONOMY.keys():
            if current_labels.get(head_name) != original_labels.get(head_name):
                modified = True
                break
        
        self.corrections[self.current_index] = {
            "labels": current_labels,
            "modified": modified,
            "needs_review": False
        }
        
        self.next_image()
    
    def mark_for_review(self):
        """Mark image for further review."""
        self.corrections[self.current_index] = {
            "labels": self.get_current_labels(),
            "modified": False,
            "needs_review": True
        }
        
        self.next_image()
    
    def save_corrections(self):
        """Save all corrections to file."""
        if not self.corrections:
            messagebox.showinfo("No Changes", "No corrections to save.")
            return
        
        # Update labels with corrections
        corrected_labels = []
        
        for i, label_data in enumerate(self.labels):
            if i in self.corrections:
                correction = self.corrections[i]
                updated_label = label_data.copy()
                updated_label.update(correction["labels"])
                updated_label["manual_review"] = correction.get("needs_review", False)
                updated_label["corrected"] = correction.get("modified", False)
                corrected_labels.append(updated_label)
            else:
                corrected_labels.append(label_data)
        
        # Save to output file
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.output_path, 'w') as f:
            for label in corrected_labels:
                f.write(json.dumps(label) + '\n')
        
        num_modified = sum(1 for c in self.corrections.values() if c.get('modified'))
        num_needs_review = sum(1 for c in self.corrections.values() if c.get('needs_review'))
        
        messagebox.showinfo(
            "Saved",
            f"Corrections saved to {self.output_path}\n\n"
            f"Reviewed: {len(self.corrections)}\n"
            f"Modified: {num_modified}\n"
            f"Needs review: {num_needs_review}"
        )
        
        self.status_label.config(text=f"Saved! Reviewed: {len(self.corrections)}, Modified: {num_modified}")


def main():
    parser = argparse.ArgumentParser(description="Review and correct labels with GUI")
    parser.add_argument("--labels", type=str, required=True,
                       help="Path to labels.jsonl file")
    parser.add_argument("--images-root", type=str, default=None,
                       help="Root directory for images (default: auto-detect from labels)")
    parser.add_argument("--output", type=str, default=None,
                       help="Output path for corrected labels (default: labels_corrected.jsonl)")
    parser.add_argument("--input", type=str, default=None,
                       help="Review specific images from list file")
    
    args = parser.parse_args()
    
    labels_path = Path(args.labels)
    
    if not labels_path.exists():
        print(f"✗ Labels file not found: {labels_path}")
        return
    
    # Load labels
    print(f"Loading labels from {labels_path}...")
    labels = []
    with open(labels_path, 'r') as f:
        for line in f:
            if line.strip():
                labels.append(json.loads(line))
    
    # Filter by input list if provided
    if args.input:
        input_path = Path(args.input)
        if input_path.exists():
            with open(input_path, 'r') as f:
                review_list = set(line.strip() for line in f)
            
            labels = [l for l in labels if l.get("labeled_image_path") in review_list or l.get("image_path") in review_list]
            print(f"✓ Filtered to {len(labels)} images from review list")
    
    print(f"✓ Loaded {len(labels)} labels")
    
    # Determine images root
    if args.images_root:
        images_root = Path(args.images_root)
    else:
        # Auto-detect from first label
        if labels:
            first_image = labels[0].get("labeled_image_path", labels[0].get("image_path", ""))
            images_root = labels_path.parent / Path(first_image).parent
        else:
            images_root = labels_path.parent
    
    print(f"Images root: {images_root}")
    
    # Output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = labels_path.parent / "labels_corrected.jsonl"
    
    # Create GUI
    root = tk.Tk()
    app = LabelReviewGUI(root, labels, images_root, output_path)
    root.mainloop()


if __name__ == "__main__":
    main()
