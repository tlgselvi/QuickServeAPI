import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Tarih seçiniz",
  label,
  error,
  disabled = false,
  className,
  required = false,
  minDate,
  maxDate
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <Label className={cn(error && "text-red-500")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd MMMM yyyy", { locale: tr }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date);
              setOpen(false);
            }}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

interface DateRangePickerProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Tarih aralığı seçiniz",
  label,
  error,
  disabled = false,
  className,
  required = false,
  minDate,
  maxDate
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const formatDateRange = () => {
    if (!value?.from) return placeholder;
    
    if (!value.to) {
      return format(value.from, "dd MMMM yyyy", { locale: tr });
    }
    
    return `${format(value.from, "dd MMM", { locale: tr })} - ${format(value.to, "dd MMM yyyy", { locale: tr })}`;
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className={cn(error && "text-red-500")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value?.from && "text-muted-foreground",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: value?.from, to: value?.to }}
            onSelect={(range) => {
              onChange?.(range || { from: undefined, to: undefined });
              if (range?.from && range?.to) {
                setOpen(false);
              }
            }}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

// Predefined date range options
export const DATE_RANGE_OPTIONS = [
  {
    label: "Bugün",
    value: "today",
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    }
  },
  {
    label: "Dün",
    value: "yesterday",
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    }
  },
  {
    label: "Bu Hafta",
    value: "thisWeek",
    getRange: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: today };
    }
  },
  {
    label: "Geçen Hafta",
    value: "lastWeek",
    getRange: () => {
      const today = new Date();
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return { from: lastWeekStart, to: lastWeekEnd };
    }
  },
  {
    label: "Bu Ay",
    value: "thisMonth",
    getRange: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfMonth, to: today };
    }
  },
  {
    label: "Geçen Ay",
    value: "lastMonth",
    getRange: () => {
      const today = new Date();
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: startOfLastMonth, to: endOfLastMonth };
    }
  },
  {
    label: "Bu Yıl",
    value: "thisYear",
    getRange: () => {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { from: startOfYear, to: today };
    }
  },
  {
    label: "Geçen Yıl",
    value: "lastYear",
    getRange: () => {
      const lastYear = new Date().getFullYear() - 1;
      const startOfLastYear = new Date(lastYear, 0, 1);
      const endOfLastYear = new Date(lastYear, 11, 31);
      return { from: startOfLastYear, to: endOfLastYear };
    }
  }
] as const;

interface DateRangePresetProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DateRangePreset({
  value,
  onChange,
  label,
  error,
  disabled = false,
  className,
  required = false,
  minDate,
  maxDate
}: DateRangePresetProps) {
  const [open, setOpen] = useState(false);

  const formatDateRange = () => {
    if (!value?.from) return "Tarih aralığı seçiniz";
    
    if (!value.to) {
      return format(value.from, "dd MMMM yyyy", { locale: tr });
    }
    
    return `${format(value.from, "dd MMM", { locale: tr })} - ${format(value.to, "dd MMM yyyy", { locale: tr })}`;
  };

  const handlePresetSelect = (preset: typeof DATE_RANGE_OPTIONS[0]) => {
    const range = preset.getRange();
    onChange?.(range);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className={cn(error && "text-red-500")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value?.from && "text-muted-foreground",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r">
              <div className="p-3">
                <h4 className="font-medium text-sm mb-2">Hızlı Seçim</h4>
                <div className="grid gap-1">
                  {DATE_RANGE_OPTIONS.map((preset) => (
                    <Button
                      key={preset.value}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-left font-normal"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={{ from: value?.from, to: value?.to }}
              onSelect={(range) => {
                onChange?.(range || { from: undefined, to: undefined });
                if (range?.from && range?.to) {
                  setOpen(false);
                }
              }}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              numberOfMonths={2}
              initialFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
