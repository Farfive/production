import React from 'react';
import { cn } from '../../lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [Number(e.target.value)];
    onValueChange(newValue);
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0] || 0}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer',
          'slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4',
          'slider-thumb:rounded-full slider-thumb:bg-primary-500',
          'slider-thumb:cursor-pointer focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-gray-700'
        )}
      />
    </div>
  );
};

export default Slider; 