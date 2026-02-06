# Phase 1.5: Prompt Preview Panel - Implementation Plan

**Date**: 2026-02-02
**Status**: Planning Phase
**Duration**: 2-3 days
**Priority**: HIGH (Excellent UX improvement)

---

## 🎯 Overview

Add a **real-time preview panel** to the PromptEditor that shows users exactly how their 6-layer prompt will be assembled and sent to the LLM. This dramatically improves the prompt creation experience by providing instant visual feedback.

---

## 💡 Why This Matters

### User Benefits
1. **See the Final Result**: Users can visualize the complete assembled prompt before saving
2. **Catch Issues Early**: Spot formatting problems, missing variables, or unclear instructions immediately
3. **Optimize Token Usage**: Real-time token counting helps users stay within model limits
4. **Better Prompt Quality**: Visual feedback leads to better-structured, clearer prompts
5. **Faster Iteration**: No need to save → test → edit → repeat cycle

### Technical Benefits
1. **Validation**: Ensures all 6 layers combine correctly
2. **Debug Tool**: Helps developers understand prompt assembly logic
3. **Copy/Export**: Easy way to share or export prompts for review

---

## 📐 UI Design

### Split-Pane Layout

```
┌─────────────────────────────────┬──────────────────────────────────┐
│  PROMPT EDITOR (60%)            │  PREVIEW PANEL (40%)             │
│                                 │                                  │
│  [Metadata Section]             │  ╔═══════════════════════════╗  │
│  Name: Healthcare Voice VA      │  ║ FINAL PROMPT PREVIEW      ║  │
│  Channel: Voice                 │  ╚═══════════════════════════╝  │
│                                 │                                  │
│  [Layer 1: System Prompt]       │  You are a helpful healthcare    │
│  [Textarea]                     │  assistant for Acme Healthcare.  │
│                                 │                                  │
│  [Layer 2: Persona]             │  ## Persona                      │
│  Tone: Professional             │  - Tone: Professional            │
│  Personality: Empathetic        │  - Personality: Empathetic       │
│                                 │                                  │
│  [Layer 3: Business Context]    │  ## Business Context             │
│  Services: [...]                │  Services Offered:               │
│                                 │  - Primary Care                  │
│                                 │  - Urgent Care                   │
│                                 │                                  │
│  [Layer 4: RAG Config]          │  ## Knowledge Sources            │
│                                 │  - RAG Enabled: No               │
│                                 │                                  │
│  [Layer 5: Conversation]        │  ## Conversation Behavior        │
│                                 │  Greeting: "Hello! How can I     │
│                                 │  help you today?"                │
│                                 │                                  │
│  [Layer 6: Constraints]         │  ## Constraints                  │
│                                 │  Prohibited Topics:              │
│                                 │  - Medical diagnosis             │
│                                 │  - Prescriptions                 │
│                                 │                                  │
│  [Save Button]                  │  ┌────────────────────────────┐ │
│                                 │  │ 📊 Token Count: 1,247      │ │
│                                 │  │ 📝 Word Count: 523         │ │
│                                 │  │ 🔤 Character Count: 3,456  │ │
│                                 │  └────────────────────────────┘ │
│                                 │                                  │
│                                 │  [📋 Copy] [🧪 Test] [🔽 Export]│
└─────────────────────────────────┴──────────────────────────────────┘
```

### Preview Panel Features

**Header:**
- Title: "Final Prompt Preview"
- Collapse/Expand button
- Model selector (for token counting: GPT-4, Claude, etc.)

**Body:**
- Syntax-highlighted assembled prompt
- Collapsible sections for each layer
- Variable placeholders highlighted in different color
- Auto-scrolls to currently edited layer

**Footer:**
- Token count (real-time, model-specific)
- Word count
- Character count
- Action buttons: Copy, Test, Export

---

## 🛠️ Implementation Tasks

### Task 1: Create PromptPreview Component

**File**: `product-management/frontend/src/components/PromptPreview.tsx`

**Requirements:**
- React component with TypeScript
- Receives `prompt` prop (IPromptVersion)
- Real-time updates on prompt changes
- Syntax highlighting using `react-syntax-highlighter`
- Collapsible sections for each layer
- Copy to clipboard functionality
- Export as .txt or .md file

**Props Interface:**
```typescript
interface PromptPreviewProps {
  prompt: IPromptVersion;
  onCopy?: () => void;
  onExport?: (format: 'txt' | 'md') => void;
  highlightLayer?: number; // Which layer is currently being edited
  modelType?: 'gpt-4' | 'claude-3' | 'gpt-3.5'; // For token counting
}
```

**Key Methods:**
- `assemblePrompt()`: Combines all 6 layers into final string
- `countTokens()`: Returns token count for selected model
- `handleCopy()`: Copies assembled prompt to clipboard
- `handleExport()`: Downloads prompt as file

**Estimated Size**: 250-300 lines

---

### Task 2: Create Prompt Assembly Service

**File**: `product-management/frontend/src/services/promptPreview.service.ts`

**Requirements:**
- Pure service (no React dependencies)
- Assembles all 6 layers into markdown-formatted string
- Handles variable substitution (shows placeholders like `{{tenantName}}`)
- Token counting for multiple models
- Formatting helpers (spacing, sections, bullet points)

**Key Functions:**
```typescript
export class PromptPreviewService {
  // Assemble all layers into final prompt string
  static assemblePrompt(prompt: IPromptVersion): string

  // Count tokens for specific model
  static countTokens(text: string, model: 'gpt-4' | 'claude-3' | 'gpt-3.5'): number

  // Format individual layers
  static formatSystemPrompt(content: string): string
  static formatPersona(persona: IPersona): string
  static formatBusinessContext(context: IBusinessContext): string
  static formatRagConfig(rag: IRagConfig): string
  static formatConversationBehavior(behavior: IConversationBehavior): string
  static formatConstraints(constraints: IConstraints): string

  // Utility functions
  static extractVariables(text: string): string[]
  static validateVariables(text: string, availableVars: string[]): boolean
  static wordCount(text: string): number
  static characterCount(text: string): number
}
```

**Token Counting Implementation:**
```typescript
import { encoding_for_model } from 'tiktoken';
import { Anthropic } from '@anthropic-ai/sdk';

static countTokens(text: string, model: string): number {
  if (model.startsWith('gpt')) {
    // Use tiktoken for OpenAI models
    const enc = encoding_for_model(model);
    const tokens = enc.encode(text);
    enc.free();
    return tokens.length;
  } else if (model.startsWith('claude')) {
    // Use Anthropic SDK for Claude models
    const anthropic = new Anthropic();
    return anthropic.countTokens(text);
  }
  // Fallback: rough estimate (4 chars = 1 token)
  return Math.ceil(text.length / 4);
}
```

**Estimated Size**: 150-200 lines

---

### Task 3: Update PromptEditor with Split-Pane

**File**: `product-management/frontend/src/pages/PromptEditor.tsx` (modify)

**Requirements:**
- Add `react-split-pane` library for resizable panels
- Integrate PromptPreview component
- Pass prompt state to preview
- Debounce preview updates (500ms) to avoid lag
- Track which layer is being edited (highlight in preview)
- Add toggle button to show/hide preview

**Changes:**
1. Import PromptPreview and react-split-pane
2. Wrap form and preview in `<SplitPane>` component
3. Add state for `highlightedLayer` (tracks current editing layer)
4. Debounce preview updates using `useMemo` or `useCallback`
5. Add preview toggle button in header

**Code Example:**
```typescript
import SplitPane from 'react-split-pane';
import PromptPreview from '../components/PromptPreview';

const PromptEditor: React.FC = () => {
  const [showPreview, setShowPreview] = useState(true);
  const [highlightedLayer, setHighlightedLayer] = useState<number | null>(null);

  // Debounce prompt updates to preview (500ms)
  const debouncedPrompt = useMemo(() => {
    return debounce(prompt, 500);
  }, [prompt]);

  return (
    <EditorContainer>
      <Header>
        <Title>{id ? 'Edit Prompt' : 'Create New Prompt'}</Title>
        <HeaderActions>
          <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </HeaderActions>
      </Header>

      {showPreview ? (
        <SplitPane split="vertical" defaultSize="60%" minSize={400} maxSize={-400}>
          {/* Left: Form */}
          <FormContainer>
            {/* Existing form layers */}
          </FormContainer>

          {/* Right: Preview */}
          <PromptPreview
            prompt={debouncedPrompt}
            highlightLayer={highlightedLayer}
            modelType="gpt-4"
            onCopy={() => alert('Copied to clipboard!')}
            onExport={(format) => handleExport(format)}
          />
        </SplitPane>
      ) : (
        <FormContainer>
          {/* Existing form (full width) */}
        </FormContainer>
      )}
    </EditorContainer>
  );
};
```

**Estimated Changes**: +100-150 lines

---

### Task 4: Add Dependencies

**File**: `product-management/frontend/package.json` (modify)

**New Dependencies:**
```json
{
  "dependencies": {
    "tiktoken": "^1.0.7",                 // Token counting (OpenAI)
    "@anthropic-ai/sdk": "^0.9.0",        // Token counting (Claude)
    "react-syntax-highlighter": "^15.5.0", // Syntax highlighting
    "react-split-pane": "^0.1.92"         // Resizable split layout
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.0",
    "@types/react-split-pane": "^0.1.3"
  }
}
```

**Installation:**
```bash
cd product-management/frontend
npm install tiktoken @anthropic-ai/sdk react-syntax-highlighter react-split-pane
npm install --save-dev @types/react-syntax-highlighter @types/react-split-pane
```

---

### Task 5: Optional Enhancements

#### 5.1 Test with Sample Input
Add a "Test Prompt" button that opens a modal:
- Input field for sample user message
- Shows how the LLM would respond (simulated or real API call)
- Helps validate prompt quality

#### 5.2 Token Count Breakdown
Show token count per layer:
```
System Prompt: 245 tokens
Persona: 123 tokens
Business Context: 456 tokens
RAG Config: 0 tokens
Conversation: 89 tokens
Constraints: 234 tokens
─────────────────────────
Total: 1,247 tokens
```

#### 5.3 Version Comparison
If editing an existing prompt:
- Show diff between current version and saved version
- Highlight what changed in preview

#### 5.4 Variable Validation
- Detect all `{{variableName}}` placeholders
- Show list of detected variables
- Warn if variable is used but not defined

---

## 📊 Example Preview Output

### Input (6 Layers):
- **Layer 1 (System)**: "You are a helpful healthcare assistant for Acme Healthcare."
- **Layer 2 (Persona)**: Tone: Professional, Personality: Empathetic
- **Layer 3 (Business)**: Services: Primary Care, Urgent Care; Location: 123 Main St
- **Layer 4 (RAG)**: Enabled: No
- **Layer 5 (Conversation)**: Greeting: "Hello! How can I help you today?"
- **Layer 6 (Constraints)**: Prohibited: Medical diagnosis, Prescriptions

### Output (Assembled Preview):
```markdown
# Healthcare Voice Assistant Prompt

You are a helpful healthcare assistant for Acme Healthcare. Your role is to assist patients with scheduling appointments, answering general healthcare questions, and providing information about our services.

## Persona
- **Tone**: Professional and empathetic
- **Personality**: Caring, patient, and supportive
- **Allowed Actions**:
  - Schedule appointments
  - Provide general health information
  - Answer questions about services
  - Transfer to human agent
- **Disallowed Actions**:
  - Provide medical diagnosis
  - Prescribe medications
  - Give emergency medical advice

## Business Context

### Services Offered
- Primary Care
- Urgent Care

### Locations
**Main Office**
- Address: 123 Main St, City, ST 12345
- Phone: (555) 123-4567
- Hours: Mon-Fri 8am-6pm

## Conversation Behavior
- **Greeting**: "Hello! Thank you for contacting Acme Healthcare. How can I help you today?"
- **Fallback**: "I'm not sure I understand. Could you please rephrase that?"
- **Ask for name first**: Yes
- **Conversation memory**: 10 turns

## Constraints
### Prohibited Topics
- Medical diagnosis
- Prescribing medications
- Emergency medical situations (redirect to 911)

### Compliance Rules
- HIPAA compliant
- Do not share patient information
- Always verify patient identity before discussing health records

### Requirements
- **Require consent**: Yes
- **Max conversation turns**: 50

────────────────────────────────────────────────

📊 Token Count: 1,247 tokens (GPT-4)
📝 Word Count: 523 words
🔤 Character Count: 3,456 characters
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Preview updates when any layer is modified
- [ ] Token count is accurate (matches official tokenizers)
- [ ] Token count updates in real-time (debounced)
- [ ] Copy to clipboard works correctly
- [ ] Export as .txt works correctly
- [ ] Export as .md works correctly
- [ ] All 6 layers are visible in preview
- [ ] Layers are properly formatted with markdown
- [ ] Variable placeholders are highlighted
- [ ] Syntax highlighting applies correctly

### Layout Tests
- [ ] Split-pane is resizable (drag divider)
- [ ] Preview can be collapsed (toggle button)
- [ ] Preview can be expanded (toggle button)
- [ ] Layout is responsive (no overflow)
- [ ] Minimum width enforced (400px each side)

### Performance Tests
- [ ] No lag when typing in form
- [ ] Debouncing works (preview updates after 500ms)
- [ ] Token counting doesn't block UI
- [ ] Large prompts (5000+ tokens) render smoothly

### Edge Cases
- [ ] Empty prompt (all layers blank)
- [ ] Missing layers (partial prompt)
- [ ] Very long text (10,000+ characters)
- [ ] Special characters in text
- [ ] Invalid variable syntax `{{unclosed`

---

## 📁 Files Summary

### New Files (2)
1. `product-management/frontend/src/components/PromptPreview.tsx` (250-300 lines)
2. `product-management/frontend/src/services/promptPreview.service.ts` (150-200 lines)

### Modified Files (2)
1. `product-management/frontend/src/pages/PromptEditor.tsx` (+100-150 lines)
2. `product-management/frontend/package.json` (+4 dependencies)

### Total New Code
- **Estimated**: 500-650 lines
- **Duration**: 2-3 days

---

## 🚀 Implementation Order

### Day 1: Foundation
1. Install dependencies (`tiktoken`, `@anthropic-ai/sdk`, `react-syntax-highlighter`, `react-split-pane`)
2. Create `promptPreview.service.ts` with:
   - `assemblePrompt()` function
   - Token counting for GPT-4 and Claude
   - Layer formatting functions
3. Write unit tests for service

### Day 2: Component
1. Create `PromptPreview.tsx` component with:
   - Basic layout (header, body, footer)
   - Syntax highlighting integration
   - Token/word/character counters
   - Copy to clipboard button
2. Test component in isolation (Storybook or separate route)

### Day 3: Integration
1. Update `PromptEditor.tsx`:
   - Add split-pane layout
   - Integrate PromptPreview component
   - Add debouncing for performance
   - Add toggle button
2. End-to-end testing with real prompts
3. Polish UI/UX (styling, spacing, colors)

---

## 💡 Future Enhancements (Post-Phase 1.5)

1. **AI-Powered Suggestions**: Use Claude API to suggest improvements to the prompt directly in the preview
2. **Live Testing**: Connect to LLM API and test prompt with sample inputs in real-time
3. **Template Library**: Browse and preview pre-made prompt templates
4. **Collaborative Editing**: Share preview link with team members for feedback
5. **Version Diff**: Show side-by-side diff between current and previous versions in preview
6. **Export Formats**: Add JSON, YAML, and API-ready formats

---

## 📝 Success Criteria

Phase 1.5 is complete when:
- ✅ PromptPreview component renders all 6 layers correctly
- ✅ Token counting works for GPT-4 and Claude models
- ✅ Split-pane layout is functional and resizable
- ✅ Copy to clipboard works
- ✅ Export as .txt and .md works
- ✅ Performance is smooth (no lag when typing)
- ✅ All tests pass
- ✅ User feedback is positive

---

**Ready to implement? Let's build this!** 🎉
