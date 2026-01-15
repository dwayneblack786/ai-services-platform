# Advanced Form Handling & Validation Guide

📑 **Table of Contents**
- [Overview](#overview)
- [Form Validation Strategies](#form-validation-strategies)
  - [Built-in HTML Validation](#built-in-html-validation)
  - [Custom Validation Schema](#custom-validation-schema)
  - [Using Zod for Type-Safe Validation](#using-zod-for-type-safe-validation)
- [Advanced Form Hook](#advanced-form-hook)
- [Async Field Validation](#async-field-validation)
- [Multi-Step Forms (Wizards)](#multi-step-forms-wizards)
- [Dynamic Form Fields](#dynamic-form-fields)
- [File Upload Forms](#file-upload-forms)
- [Field Dependencies](#field-dependencies)
- [Form State Persistence](#form-state-persistence)
- [Form Checklist](#form-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This document covers advanced form patterns, validation strategies, complex form state management, multi-step forms, and field dependencies.

**Key Areas:**
- Form libraries and custom solutions
- Real-time validation and error handling
- Async validation (server-side)
- Complex field dependencies
- Multi-step forms and wizards
- File uploads
- Dynamic form fields

## Form Validation Strategies

### Built-in HTML Validation

```typescript
// src/components/forms/SimpleForm.tsx
const SimpleForm: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // HTML5 validation runs automatically
    if (e.currentTarget.checkValidity()) {
      console.log('Form valid, submit:', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input
        type="email"
        value={formData.email}
        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
        required
        pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
      />
      <input
        type="password"
        value={formData.password}
        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
        required
        minLength={8}
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### Custom Validation Schema

```typescript
// src/validation/schemas.ts
export interface ValidationRule {
  validate: (value: any) => boolean | string;
  message: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

// Example schema
export const loginSchema: ValidationSchema = {
  email: [
    {
      validate: (value: string) => value.length > 0,
      message: 'Email is required',
    },
    {
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email format',
    },
  ],
  password: [
    {
      validate: (value: string) => value.length > 0,
      message: 'Password is required',
    },
    {
      validate: (value: string) => value.length >= 8,
      message: 'Password must be at least 8 characters',
    },
  ],
};

// Validation function
export const validateField = (
  field: string,
  value: any,
  schema: ValidationSchema
): string[] => {
  const rules = schema[field] || [];
  const errors: string[] = [];

  rules.forEach(rule => {
    const result = rule.validate(value);
    if (result !== true) {
      errors.push(typeof result === 'string' ? result : rule.message);
    }
  });

  return errors;
};

export const validateForm = (
  formData: Record<string, any>,
  schema: ValidationSchema
): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  Object.keys(schema).forEach(field => {
    const fieldErrors = validateField(field, formData[field], schema);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });

  return errors;
};
```

### Using Zod for Type-Safe Validation

```bash
npm install zod
```

```typescript
// src/validation/schemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// In form component
const form = useForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    try {
      loginSchema.parse(values);
      return {};
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Object.fromEntries(
          error.errors.map(err => [err.path[0], err.message])
        );
      }
      return {};
    }
  },
});
```

## Advanced Form Hook

```typescript
// src/hooks/useAdvancedForm.ts
interface UseAdvancedFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Record<keyof T, string>;
  onSubmit: (values: T) => Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useAdvancedForm<T extends Record<string, any>>(
  options: UseAdvancedFormOptions<T>
) {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const validateField = useCallback(
    (field: keyof T, value: any) => {
      if (!options.validate) return '';

      try {
        const allErrors = options.validate(values);
        return allErrors[field] || '';
      } catch (error) {
        return '';
      }
    },
    [options, values]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.currentTarget;
      const fieldName = name as keyof T;

      let newValue: any = value;
      if (type === 'checkbox') {
        newValue = (e.currentTarget as HTMLInputElement).checked;
      } else if (type === 'number') {
        newValue = parseFloat(value);
      }

      setValues(prev => ({ ...prev, [fieldName]: newValue }));
      setIsDirty(true);

      if (options.validateOnChange) {
        const error = validateField(fieldName, newValue);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      } else if (touched[fieldName]) {
        const error = validateField(fieldName, newValue);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    },
    [options.validateOnChange, touched, validateField]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = e.currentTarget;
      const fieldName = name as keyof T;

      setTouched(prev => ({ ...prev, [fieldName]: true }));

      if (options.validateOnBlur !== false) {
        const error = validateField(fieldName, values[fieldName]);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    },
    [options.validateOnBlur, values, validateField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate all fields
      const newErrors: Partial<Record<keyof T, string>> = {};
      let hasErrors = false;

      Object.keys(values).forEach(field => {
        const error = validateField(field as keyof T, values[field as keyof T]);
        if (error) {
          newErrors[field as keyof T] = error;
          hasErrors = true;
        }
      });

      setErrors(newErrors);

      if (hasErrors) {
        return;
      }

      setIsSubmitting(true);
      try {
        await options.onSubmit(values);
        setIsDirty(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateField, options]
  );

  const reset = useCallback(() => {
    setValues(options.initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [options.initialValues]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
  };
}
```

## Async Field Validation

```typescript
// src/hooks/useAsyncValidation.ts
interface AsyncValidationOptions {
  debounceMs?: number;
}

export function useAsyncValidation<T>(
  validationFn: (value: T) => Promise<string | null>,
  options: AsyncValidationOptions = {}
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { debounceMs = 500 } = options;

  const validate = useCallback(
    debounce(async (value: T) => {
      setIsValidating(true);
      try {
        const result = await validationFn(value);
        setError(result);
      } catch (err) {
        setError('Validation error');
      } finally {
        setIsValidating(false);
      }
    }, debounceMs),
    [validationFn, debounceMs]
  );

  return { error, isValidating, validate };
}

// Example: Check if email already exists
const useEmailValidation = (email: string) => {
  const { error, isValidating, validate } = useAsyncValidation(
    async (value: string) => {
      const response = await axios.get(`/api/auth/check-email?email=${value}`);
      return response.data.exists ? 'Email already registered' : null;
    },
    { debounceMs: 800 }
  );

  useEffect(() => {
    if (email) {
      validate(email);
    }
  }, [email, validate]);

  return { error, isValidating };
};
```

## Multi-Step Forms (Wizards)

```typescript
// src/components/forms/WizardForm.tsx
interface FormStep {
  id: string;
  title: string;
  validate: (data: any) => Record<string, string>;
  component: React.ComponentType<any>;
}

interface WizardFormProps {
  steps: FormStep[];
  onComplete: (data: any) => Promise<void>;
}

export const WizardForm: React.FC<WizardFormProps> = ({ steps, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = steps[currentStep];
  const StepComponent = step.component;

  const handleNext = () => {
    const stepErrors = step.validate(formData);
    if (Object.keys(stepErrors).length === 0) {
      setErrors({});
      if (currentStep < steps.length - 1) {
        setCurrentStep(current => current + 1);
      } else {
        handleSubmit();
      }
    } else {
      setErrors(stepErrors);
    }
  };

  const handleBack = () => {
    setCurrentStep(current => Math.max(0, current - 1));
    setErrors({});
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="step-indicator">
        {steps.map((s, index) => (
          <div
            key={s.id}
            className={`step ${index === currentStep ? 'active' : ''} ${
              index < currentStep ? 'completed' : ''
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {/* Step content */}
      <StepComponent
        formData={formData}
        errors={errors}
        onChange={setFormData}
      />

      {/* Navigation */}
      <div className="wizard-navigation">
        <button onClick={handleBack} disabled={currentStep === 0}>
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={isSubmitting}
        >
          {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
        </button>
      </div>

      {/* Progress */}
      <div className="progress">
        {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
};

// Usage example
const steps: FormStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    validate: (data) => ({
      firstName: !data.firstName ? 'First name required' : '',
      lastName: !data.lastName ? 'Last name required' : '',
    }),
    component: PersonalInfoStep,
  },
  {
    id: 'contact',
    title: 'Contact Information',
    validate: (data) => ({
      email: !data.email ? 'Email required' : '',
      phone: !data.phone ? 'Phone required' : '',
    }),
    component: ContactInfoStep,
  },
  {
    id: 'confirm',
    title: 'Confirm',
    validate: () => ({}),
    component: ConfirmStep,
  },
];
```

## Dynamic Form Fields

```typescript
// src/components/forms/DynamicForm.tsx
interface DynamicField {
  name: string;
  type: 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  condition?: (formData: any) => boolean;
  validate?: (value: any) => string | null;
}

interface DynamicFormProps {
  fields: DynamicField[];
  onSubmit: (data: any) => Promise<void>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ fields, onSubmit }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const visibleFields = fields.filter(
    field => !field.condition || field.condition(formData)
  );

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    visibleFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validate) {
        const error = field.validate(formData[field.name]);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {visibleFields.map(field => {
        const error = errors[field.name];
        const value = formData[field.name] || '';

        return (
          <div key={field.name} className="form-group">
            <label htmlFor={field.name}>{field.label}</label>

            {field.type === 'select' && (
              <select
                id={field.name}
                value={value}
                onChange={e => handleChange(field.name, e.currentTarget.value)}
              >
                <option value="">Select...</option>
                {field.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'checkbox' && (
              <input
                type="checkbox"
                id={field.name}
                checked={value}
                onChange={e => handleChange(field.name, e.currentTarget.checked)}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                id={field.name}
                value={value}
                onChange={e => handleChange(field.name, e.currentTarget.value)}
              />
            )}

            {['text', 'email', 'number'].includes(field.type) && (
              <input
                type={field.type}
                id={field.name}
                value={value}
                onChange={e => handleChange(field.name, e.currentTarget.value)}
              />
            )}

            {error && <span className="error">{error}</span>}
          </div>
        );
      })}

      <button type="submit">Submit</button>
    </form>
  );
};
```

## File Upload Forms

```typescript
// src/components/forms/FileUpload.tsx
interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  onUpload: (files: File[]) => Promise<void>;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*/*',
  multiple = false,
  maxSize,
  onUpload,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (filesToValidate: File[]): boolean => {
    const newErrors: string[] = [];

    filesToValidate.forEach(file => {
      if (maxSize && file.size > maxSize) {
        newErrors.push(
          `${file.name} exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
        );
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.currentTarget.files || []);

    if (validateFiles(selectedFiles)) {
      setFiles(multiple ? selectedFiles : selectedFiles.slice(0, 1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);

    if (validateFiles(droppedFiles)) {
      setFiles(multiple ? droppedFiles : droppedFiles.slice(0, 1));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
      setErrors([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          hidden
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          Select Files
        </button>
        <p>or drag files here</p>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map(file => (
            <div key={file.name} className="file-item">
              <span>{file.name}</span>
              <span>{(file.size / 1024 / 1024).toFixed(2)}MB</span>
            </div>
          ))}
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="errors">
          {errors.map(error => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Field Dependencies

```typescript
// src/hooks/useDependentFields.ts
interface FieldDependencies {
  [field: string]: {
    dependsOn: string[];
    transform?: (values: any) => any;
  };
}

export function useDependentFields(
  initialValues: Record<string, any>,
  dependencies: FieldDependencies
) {
  const [values, setValues] = useState(initialValues);

  const updateField = useCallback(
    (field: string, value: any) => {
      const newValues = { ...values, [field]: value };

      // Update dependent fields
      Object.entries(dependencies).forEach(([depField, config]) => {
        if (config.dependsOn.includes(field)) {
          if (config.transform) {
            newValues[depField] = config.transform(newValues);
          } else {
            newValues[depField] = '';
          }
        }
      });

      setValues(newValues);
    },
    [values, dependencies]
  );

  return { values, updateField };
}

// Example: State/City dependency
const stateToCity = {
  CA: ['Los Angeles', 'San Francisco', 'San Diego'],
  TX: ['Houston', 'Dallas', 'Austin'],
};

const { values, updateField } = useDependentFields(
  { state: '', city: '' },
  {
    city: {
      dependsOn: ['state'],
      transform: (vals) => {
        const cities = stateToCity[vals.state] || [];
        return cities[0] || '';
      },
    },
  }
);
```

## Form State Persistence

```typescript
// src/hooks/usePersistedForm.ts
export function usePersistedForm<T>(
  key: string,
  initialValues: T
) {
  const [values, setValues] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValues;
  });

  const handleChange = useCallback(
    (field: keyof T, value: any) => {
      setValues(prev => {
        const updated = { ...prev, [field]: value };
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    },
    [key]
  );

  const clearSaved = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return { values, handleChange, clearSaved };
}
```

## Form Checklist

- [ ] Basic validation implemented (client-side)
- [ ] Async validation for unique fields (email, username)
- [ ] Error messages clear and helpful
- [ ] Form state persisted to localStorage (optional)
- [ ] Multi-step forms supported
- [ ] File uploads supported
- [ ] Disabled submit when invalid
- [ ] Loading state during submission
- [ ] Success/error notifications
- [ ] Keyboard navigation works
- [ ] Accessibility (labels, aria-*) implemented
- [ ] Mobile responsive
- [ ] XSS prevention (sanitization)

## Related Documentation

- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Form component patterns
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling in forms
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Form testing

