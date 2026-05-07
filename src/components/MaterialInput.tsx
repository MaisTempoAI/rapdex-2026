import * as React from "react";
import { cn } from "@/lib/utils";

interface MaterialInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

const MaterialInput = React.forwardRef<HTMLInputElement, MaterialInputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    React.useEffect(() => {
      setHasValue(props.value ? String(props.value).length > 0 : false);
    }, [props.value]);

    return (
      <div className="w-full space-y-1">
        <label className="block text-sm font-medium text-surface-foreground">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              "w-full h-12 rounded-lg border-2 border-border bg-surface px-4 text-surface-foreground transition-all duration-300 ease-standard",
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

MaterialInput.displayName = "MaterialInput";

export { MaterialInput };