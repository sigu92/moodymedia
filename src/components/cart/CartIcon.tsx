import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

interface CartIconProps {
  onClick?: () => void;
  className?: string;
}

export function CartIcon({ onClick, className }: CartIconProps) {
  const { cartCount } = useCart();
  const isMobile = useIsMobile();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (onClick) {
      // Add animation effect
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);

      // Announce cart opening to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';
      announcement.textContent = `Opening shopping cart with ${cartCount} items`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);

      onClick();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`relative ${isMobile ? 'h-8 w-8' : 'h-9 w-9'} ${
        isAnimating ? 'animate-pulse' : ''
      } transition-all duration-200 hover:scale-110 ${className}`}
      aria-label={`Shopping cart${cartCount > 0 ? ` with ${cartCount} items` : ', empty'}`}
      aria-expanded={false}
      aria-haspopup="dialog"
      aria-describedby="cart-badge"
    >
      <ShoppingBag className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
      {cartCount > 0 && (
        <Badge
          id="cart-badge"
          variant="destructive"
          className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold ${
            isAnimating ? 'animate-bounce' : ''
          }`}
          aria-label={`${cartCount > 99 ? '99 plus' : cartCount} items in cart`}
        >
          {cartCount > 99 ? '99+' : cartCount}
        </Badge>
      )}
    </Button>
  );
}
