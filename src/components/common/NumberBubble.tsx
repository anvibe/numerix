import React from 'react';

interface NumberBubbleProps {
  number: number;
  type?: 'default' | 'hot' | 'cold' | 'due' | 'selected' | 'jolly' | 'superstar';
  size?: 'sm' | 'md' | 'lg';
}

const NumberBubble: React.FC<NumberBubbleProps> = ({ 
  number, 
  type = 'default',
  size = 'md'
}) => {
  const getTypeClass = () => {
    switch (type) {
      case 'hot':
        return 'number-bubble-hot';
      case 'cold':
        return 'number-bubble-cold';
      case 'due':
        return 'number-bubble-due';
      case 'selected':
        return 'number-bubble-selected';
      case 'jolly':
        return 'number-bubble-jolly';
      case 'superstar':
        return 'number-bubble-superstar';
      default:
        return 'number-bubble';
    }
  };
  
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-sm';
      case 'lg':
        return 'w-12 h-12 text-lg font-semibold';
      default:
        return 'w-10 h-10 text-base';
    }
  };
  
  return (
    <div className={`${getTypeClass()} ${getSizeClass()}`}>
      {number}
    </div>
  );
};

export default NumberBubble;