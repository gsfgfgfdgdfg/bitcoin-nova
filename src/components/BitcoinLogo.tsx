import React from 'react';

interface BitcoinLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
};

const glowSizeClasses = {
  sm: 'w-10 h-10 -left-1 -top-1',
  md: 'w-16 h-16 -left-2 -top-2',
  lg: 'w-20 h-20 -left-2 -top-2'
};

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl'
};

export const BitcoinLogo: React.FC<BitcoinLogoProps> = ({ 
  size = 'md', 
  className = '',
  animated = true
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Outer glow effect */}
      <div 
        className={`absolute ${glowSizeClasses[size]} bg-gradient-to-br from-bitcoin-gold/40 via-bitcoin-orange/30 to-amber-500/20 rounded-full blur-xl ${animated ? 'animate-pulse-glow' : ''}`}
      />
      
      {/* Secondary glow ring */}
      <div 
        className={`absolute inset-0 ${sizeClasses[size]} bg-gradient-to-br from-bitcoin-gold/20 to-bitcoin-orange/10 rounded-full blur-md`}
      />
      
      {/* Main circle with gradient */}
      <div 
        className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br from-bitcoin-gold via-bitcoin-orange to-amber-600 shadow-lg shadow-bitcoin-orange/30 flex items-center justify-center overflow-hidden`}
      >
        {/* Inner shine effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 rounded-full" />
        
        {/* Radial highlight */}
        <div className="absolute top-1 left-1 w-3 h-3 bg-white/40 rounded-full blur-sm" />
        
        {/* Bitcoin symbol */}
        <span 
          className={`relative ${textSizeClasses[size]} font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]`}
          style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: '0 1px 2px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.3)'
          }}
        >
          ₿
        </span>
      </div>
      
      {/* Subtle outer ring */}
      <div 
        className={`absolute inset-0 ${sizeClasses[size]} rounded-full ring-1 ring-bitcoin-gold/20`}
      />
    </div>
  );
};

export default BitcoinLogo;
