import * as React from "react";
import { cn } from "@/lib/utils";

interface MaterialTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
}

const MaterialTextarea = React.forwardRef<HTMLTextAreaElement, MaterialTextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    // Combinar refs (externo e interno)
    React.useImperativeHandle(ref, () => textareaRef.current!);

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
      }
    };

    React.useEffect(() => {
      setHasValue(props.value ? String(props.value).length > 0 : false);
      // Ajustar altura quando valor muda externamente
      adjustHeight();
    }, [props.value]);

    return (
      <div className="w-full space-y-1">
        <label className="block text-sm font-medium text-surface-foreground">
          {label}
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            className={cn(
              "w-full min-h-[80px] max-h-[400px] overflow-y-auto resize-y rounded-lg border-2 border-border bg-surface px-4 py-3 text-surface-foreground transition-all duration-300 ease-standard",
              "focus:border-primary focus:outline-none focus:ring-0",
              "disabled:bg-disabled-background disabled:text-disabled-foreground disabled:border-border/50",
              error && "border-error focus:border-error",
              className
            )}
            placeholder={helperText || props.placeholder}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            onChange={(e) => {
              setHasValue(e.target.value.length > 0);
              adjustHeight();
              props.onChange?.(e);
            }}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

MaterialTextarea.displayName = "MaterialTextarea";

export { MaterialTextarea };
