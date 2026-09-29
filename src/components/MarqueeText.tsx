import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  isFocused: boolean;
  className?: string;
  speed?: number; // pixels per second
}

/**
 * MarqueeText: Displays text with an automatic smooth bounce marquee when focused
 * if the text overflows its container. Retains clean ellipsis when unfocused.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  isFocused,
  className = '',
  speed = 45,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState<number>(0);

  useEffect(() => {
    if (!isFocused) {
      setDistance(0);
      return;
    }

    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        if (textWidth > containerWidth + 4) {
          setDistance(textWidth - containerWidth + 10);
        } else {
          setDistance(0);
        }
      }
    };

    // Small delay to ensure DOM styles/widths have stabilized
    const timer = setTimeout(checkOverflow, 60);
    return () => clearTimeout(timer);
  }, [isFocused, text]);

  // Dynamic animation duration based on distance so scrolling speed is consistent
  const duration = Math.max(2.5, Math.min(8, distance / speed + 1.5));

  return (
    <div
      ref={containerRef}
      className="overflow-hidden whitespace-nowrap relative flex-1 min-w-0"
    >
      <span
        ref={textRef}
        style={
          isFocused && distance > 0
            ? {
                display: 'inline-block',
                animation: `marquee-bounce ${duration}s ease-in-out infinite alternate`,
                willChange: 'transform',
                ['--marquee-distance' as any]: `-${distance}px`,
              }
            : undefined
        }
        className={`inline-block ${
          !isFocused || distance === 0 ? 'truncate w-full' : ''
        } ${className}`}
      >
        {text}
      </span>
    </div>
  );
};
