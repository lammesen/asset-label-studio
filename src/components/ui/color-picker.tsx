import * as React from "react";
import { Pipette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#1f2937",
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ColorPicker({
  value,
  onChange,
  className,
  disabled,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  }

  function handleInputBlur() {
    if (!/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
      setInputValue(value);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 px-3 font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div
            className="h-4 w-4 rounded-sm border border-border shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="flex-1 text-left font-mono text-xs">
            {value.toUpperCase()}
          </span>
          <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Presets</Label>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded-md border shadow-sm transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    value.toLowerCase() === color.toLowerCase() &&
                      "ring-2 ring-ring ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Custom</Label>
            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-md border border-input p-0.5"
                />
              </div>
              <Input
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="#000000"
                className="h-9 flex-1 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
