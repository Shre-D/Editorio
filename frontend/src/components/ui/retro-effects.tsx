"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RetroGridProps {
  className?: string;
}

export function RetroGrid({ className }: RetroGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [perspective:200px]",
        className
      )}
    >
      <div className="absolute inset-0 [transform:rotateX(65deg)]">
        <div
          className="animate-grid"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(247, 37, 133, 0.15) 1px, transparent 0),
              linear-gradient(to bottom, rgba(247, 37, 133, 0.15) 1px, transparent 0)
            `,
            backgroundSize: "60px 60px",
            backgroundRepeat: "repeat",
            transformOrigin: "100% 0 0",
            height: "300vh",
            width: "200vw",
            marginLeft: "-50%",
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </div>
  );
}

interface GlowingOrbsProps {
  className?: string;
}

export function GlowingOrbs({ className }: GlowingOrbsProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-retro-pink/30"
        style={{ filter: "blur(100px)" }}
        animate={{
          y: [0, -30, 0],
          x: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 h-80 w-80 rounded-full bg-retro-purple/30"
        style={{ filter: "blur(100px)" }}
        animate={{
          y: [0, 40, 0],
          x: [0, -30, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/2 h-72 w-72 rounded-full bg-retro-cyan/20"
        style={{ filter: "blur(100px)" }}
        animate={{
          y: [0, 20, 0],
          x: [0, -20, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

interface MeteorsProps {
  number?: number;
}

export function Meteors({ number = 20 }: MeteorsProps) {
  const meteors = new Array(number).fill(true);
  
  return (
    <>
      {meteors.map((_, idx) => (
        <span
          key={idx}
          className="absolute top-1/2 left-1/2 h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[9999px] bg-retro-pink shadow-[0_0_0_1px_#ffffff10]"
          style={{
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
            animationDelay: Math.random() * 1 + "s",
            animationDuration: Math.floor(Math.random() * 8 + 5) + "s",
          }}
        >
          <div className="absolute top-1/2 -z-10 h-[1px] w-[50px] -translate-y-1/2 bg-gradient-to-r from-retro-pink to-transparent" />
        </span>
      ))}
    </>
  );
}

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  borderWidth = 1.5,
  colorFrom = "#f72585",
  colorTo = "#7209b7",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": duration,
        "--border-width": borderWidth,
        "--color-from": colorFrom,
        "--color-to": colorTo,
        "--delay": `-${delay}s`,
      } as React.CSSProperties}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--size)*1px)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        className
      )}
    />
  );
}

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.1em",
  shimmerDuration = "2s",
  borderRadius = "12px",
  background = "linear-gradient(135deg, #f72585 0%, #7209b7 100%)",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={{
        "--shimmer-color": shimmerColor,
        "--shimmer-size": shimmerSize,
        "--shimmer-duration": shimmerDuration,
        "--border-radius": borderRadius,
        "--bg": background,
      } as React.CSSProperties}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--border-radius)]",
        "transform-gpu transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-[0_0_40px_rgba(247,37,133,0.4)]",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-[-100%] animate-shimmer [background:linear-gradient(90deg,transparent,var(--shimmer-color)_25%,transparent_50%,var(--shimmer-color)_75%,transparent)] opacity-20" />
      </div>
      <span className="relative z-10 font-semibold">{children}</span>
    </button>
  );
}

interface TypingAnimationProps {
  text: string;
  className?: string;
  duration?: number;
}

export function TypingAnimation({ text, className, duration = 100 }: TypingAnimationProps) {
  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={{ width: 0 }}
      animate={{ width: "auto" }}
      transition={{ duration: (text.length * duration) / 1000, ease: "linear" }}
      style={{ overflow: "hidden", whiteSpace: "nowrap" }}
    >
      {text}
    </motion.span>
  );
}
