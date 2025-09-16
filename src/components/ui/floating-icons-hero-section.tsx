import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Interface for the props of each individual icon.
interface IconProps {
  id: number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  className: string; // Used for custom positioning of the icon.
}

// Interface for the main hero component's props.
export interface FloatingIconsHeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  icons: IconProps[];
}

// A single icon component with shared mouse tracking
const Icon = ({
  mouseX,
  mouseY,
  iconData,
  index,
}: {
  mouseX: number;
  mouseY: number;
  iconData: IconProps;
  index: number;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  // Motion values for the icon's position, with spring physics for smooth movement
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  // Update position based on shared mouse coordinates
  React.useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(mouseX - (rect.left + rect.width / 2), 2) +
          Math.pow(mouseY - (rect.top + rect.height / 2), 2)
      );

      // If the cursor is close enough, repel the icon
      if (distance < 150) {
        const angle = Math.atan2(
          mouseY - (rect.top + rect.height / 2),
          mouseX - (rect.left + rect.width / 2)
        );
        // The closer the cursor, the stronger the repulsion
        const force = (1 - distance / 150) * 50;
        x.set(-Math.cos(angle) * force);
        y.set(-Math.sin(angle) * force);
      } else {
        // Return to original position when cursor is away
        x.set(0);
        y.set(0);
      }
    }
  }, [mouseX, mouseY, x, y]);

  return (
    <motion.div
      ref={ref}
      key={iconData.id}
      style={{
        x: springX,
        y: springY,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.08,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn('absolute', iconData.className)}
    >
      {/* Inner wrapper for the continuous floating animation */}
      <motion.div
        className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 p-3 rounded-xl shadow-lg bg-white border border-gray-100"
        animate={{
          y: [0, -8, 0, 8, 0],
          x: [0, 6, 0, -6, 0],
          rotate: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 5 + Math.random() * 5,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      >
        <iconData.icon className="w-8 h-8 md:w-10 md:h-10" />
      </motion.div>
    </motion.div>
  );
};

const FloatingIconsHero = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & FloatingIconsHeroProps
>(({ className, title, subtitle, ctaText, ctaHref, secondaryCtaText, secondaryCtaHref, icons, ...props }, ref) => {
  // State to track mouse position (single source of truth)
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  // Throttled mouse move handler to prevent excessive updates
  const throttledMouseMove = React.useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (event: MouseEvent) => {
        if (timeoutId) return; // Skip if already scheduled

        timeoutId = setTimeout(() => {
          setMousePosition({ x: event.clientX, y: event.clientY });
          timeoutId = null;
        }, 16); // ~60fps
      };
    })(),
    []
  );

  // Single window mouse listener
  React.useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      throttledMouseMove(event);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [throttledMouseMove]);

  return (
    <section
      ref={ref}
      className={cn(
        'relative w-full h-screen min-h-[700px] flex items-center justify-center overflow-hidden bg-white',
        className
      )}
      {...props}
    >
      {/* Container for the background floating icons */}
      <div className="absolute inset-0 w-full h-full">
        {icons.map((iconData, index) => (
          <Icon
            key={iconData.id}
            mouseX={mousePosition.x}
            mouseY={mousePosition.y}
            iconData={iconData}
            index={index}
          />
        ))}
      </div>

      {/* Container for the foreground content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-800">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" className="px-8 py-4 text-base font-semibold bg-black text-white hover:bg-gray-800 rounded-lg">
            <a href={ctaHref}>{ctaText}</a>
          </Button>
          {secondaryCtaText && secondaryCtaHref && (
            <Button asChild size="lg" variant="outline" className="px-8 py-4 text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg">
              <a href={secondaryCtaHref}>{secondaryCtaText}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
});

FloatingIconsHero.displayName = 'FloatingIconsHero';

export { FloatingIconsHero };
