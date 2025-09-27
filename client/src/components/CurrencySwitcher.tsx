import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';
import { 
  DollarSign, 
  Euro, 
  Coins, 
  ChevronDown,
  Globe
} from 'lucide-react';

const currencyOptions = [
  {
    value: 'TRY' as Currency,
    label: 'Türk Lirası',
    symbol: '₺',
    icon: Coins,
    flag: '🇹🇷'
  },
  {
    value: 'USD' as Currency,
    label: 'US Dollar',
    symbol: '$',
    icon: DollarSign,
    flag: '🇺🇸'
  },
  {
    value: 'EUR' as Currency,
    label: 'Euro',
    symbol: '€',
    icon: Euro,
    flag: '🇪🇺'
  }
];

export default function CurrencySwitcher() {
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const currentCurrency = currencyOptions.find(opt => opt.value === currency);

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 h-8 px-3"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentCurrency?.flag}</span>
          <span className="font-medium">{currentCurrency?.value}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {currencyOptions.map((option) => {
          const IconComponent = option.icon;
          const isSelected = option.value === currency;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleCurrencyChange(option.value)}
              className="flex items-center gap-3 p-3 cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{option.flag}</span>
                <IconComponent className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.value} • {option.symbol}
                  </span>
                </div>
              </div>
              {isSelected && (
                <Badge variant="secondary" className="text-xs">
                  Aktif
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        
        {/* Örnek format gösterimi */}
        <div className="border-t pt-2 mt-2">
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1">Örnek format:</p>
            <p className="text-sm font-mono">
              {formatCurrency(1234.56)}
            </p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile
export function CurrencySwitcherCompact() {
  const { currency, setCurrency } = useCurrency();
  const [currentIndex, setCurrentIndex] = useState(
    currencyOptions.findIndex(opt => opt.value === currency)
  );

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % currencyOptions.length;
    setCurrentIndex(nextIndex);
    setCurrency(currencyOptions[nextIndex].value);
  };

  const currentCurrency = currencyOptions[currentIndex];
  const IconComponent = currentCurrency.icon;

  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={handleNext}
      className="flex items-center gap-1 h-8 px-2"
    >
      <IconComponent className="w-4 h-4" />
      <span className="text-sm font-medium">{currentCurrency.value}</span>
    </Button>
  );
}
