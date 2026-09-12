import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VibeSelect({
  value,
  onChange,
  options,
  placeholder,
  testId,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  testId?: string;
  disabled?: boolean;
}) {
  const optionValues = options.includes(value)
    ? options
    : value
      ? [value, ...options]
      : options;
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-auto min-h-[48px] rounded-xl border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-left text-sm shadow-none focus:ring-4 focus:ring-[hsl(var(--primary)/.1)] data-[state=open]:border-[hsl(var(--primary))] data-[state=open]:ring-4 data-[state=open]:ring-[hsl(var(--primary)/.1)]"
        data-testid={testId}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-[0_16px_40px_hsl(var(--primary)/.14)]">
        {optionValues.map((option) => (
          <SelectItem
            key={option}
            value={option}
            className="rounded-lg py-2.5 pl-3 pr-8 text-sm focus:bg-[hsl(var(--secondary))] focus:text-[hsl(var(--foreground))]"
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
