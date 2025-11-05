import React, { useEffect, useRef } from 'react';

// Extend Window interface for our custom property
declare global {
  interface Window {
    _isMouseOverAuthDiv?: boolean;
  }
}

const NumberAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const COLORS = ["#3b82f6", "#fb8c01", "#e53935"];
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W: number, H: number, dpr: number;
    const balls: Ball[] = [];
    const R = 18;
    let mouseX = W / 2;
    let mouseY = H / 2;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mouseX = W / 2;
      mouseY = H / 2;
      if (balls.length === 98) {
        layoutGrid();
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function layoutGrid() {
      const totalBalls = 98;
      if (balls.length !== totalBalls) return;
      
      // Fixed 14 columns layout
      const cols = 14;
      const rows = Math.ceil(totalBalls / cols);
      
      const gridW = W - 2 * R - 20;
      const gridH = H - 2 * R - 20;
      const cellW = cols > 1 ? gridW / (cols - 1) : 0;
      const cellH = rows > 1 ? gridH / (rows - 1) : 0;
      
      // Position all balls in grid
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (i >= totalBalls) break;
          if (i < balls.length) {
            const b = balls[i];
            b.baseX = R + 10 + (cols > 1 ? c * cellW : gridW / 2);
            b.baseY = R + 10 + (rows > 1 ? r * cellH : gridH / 2);
            b.x = b.baseX;
            b.y = b.baseY;
            b.vx = 0;
            b.vy = 0;
          }
          i++;
        }
        if (i >= totalBalls) break;
      }
    }

    class Ball {
      n: number;
      color: string;
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      vx: number;
      vy: number;
      r: number;

      constructor(n: number, color: string) {
        this.n = n;
        this.color = color;
        this.baseX = 0;
        this.baseY = 0;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.r = R + rand(-2, 2);
      }

      update() {
        // Check if ball is behind auth div (roughly centered)
        const authDivX = W / 2;
        const authDivY = H / 2;
        const authDivWidth = Math.min(448, W * 0.9);
        const authDivHeight = 600;
        
        const isBehindAuthDiv = Math.abs(this.x - authDivX) < authDivWidth / 2 && 
                               Math.abs(this.y - authDivY) < authDivHeight / 2;
        
        // If ball is behind auth div and mouse is also over auth div, don't react
        if (isBehindAuthDiv && window._isMouseOverAuthDiv) {
          // Just return to base position
          const returnSpeed = 0.12;
          this.vx = (this.baseX - this.x) * returnSpeed;
          this.vy = (this.baseY - this.y) * returnSpeed;
          this.vx *= 0.88;
          this.vy *= 0.88;
          this.x += this.vx;
          this.y += this.vy;
          return;
        }
        
        // Calculate distance from mouse to current position
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = Math.max(W, H) * 1.5; // Maximum distance for interaction - covers entire screen
        
        // All balls should react to mouse, with strength inversely proportional to distance
        if (dist > 5) {
          // Calculate attraction strength (stronger when closer, but all balls react)
          const strength = Math.max(0, (1 - dist / maxDist) * 0.8);
          const angle = Math.atan2(dy, dx);
          
          // Move towards mouse position (repel effect)
          const moveDistance = Math.min(dist * strength * 0.5, 50); // Limit max movement
          const targetX = this.x - Math.cos(angle) * moveDistance;
          const targetY = this.y - Math.sin(angle) * moveDistance;
          
          // Smooth interpolation towards target
          this.vx = (targetX - this.x) * 0.15;
          this.vy = (targetY - this.y) * 0.15;
        } else {
          // Very close to mouse - strong repel
          const repelStrength = 0.8;
          this.vx = -dx * repelStrength;
          this.vy = -dy * repelStrength;
        }
        
        // Return to base position smoothly (always try to return)
        const returnSpeed = 0.08;
        const returnX = (this.baseX - this.x) * returnSpeed;
        const returnY = (this.baseY - this.y) * returnSpeed;
        
        // Combine return force with mouse interaction
        this.vx += returnX;
        this.vy += returnY;
        
        // Apply velocity with damping
        this.vx *= 0.88;
        this.vy *= 0.88;
        this.x += this.vx;
        this.y += this.vy;
      }

      draw(g: CanvasRenderingContext2D) {
        const r = this.r;
        const grd = g.createRadialGradient(
          this.x - r * 0.3,
          this.y - r * 0.35,
          r * 0.2,
          this.x,
          this.y,
          r
        );
        grd.addColorStop(0, lighten(this.color, 0.25));
        grd.addColorStop(0.5, this.color);
        grd.addColorStop(1, shade(this.color, -0.35));

        g.save();
        g.shadowColor = 'rgba(0,0,0,0.35)';
        g.shadowBlur = 12;
        g.shadowOffsetY = 4;
        g.fillStyle = grd;
        circle(g, this.x, this.y, r);
        g.fill();

        g.globalAlpha = 0.18;
        g.fillStyle = '#fff';
        ellipse(g, this.x - r * 0.25, this.y - r * 0.35, r * 0.9, r * 0.55, -0.6);
        g.fill();
        g.globalAlpha = 1;

        g.lineWidth = 2;
        g.strokeStyle = 'rgba(255,255,255,0.75)';
        circle(g, this.x, this.y, r);
        g.stroke();

        g.fillStyle = '#fff';
        g.font = `bold ${Math.max(12, r * 0.9)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.save();
        g.shadowColor = 'rgba(0,0,0,.45)';
        g.shadowBlur = 6;
        g.shadowOffsetY = 2;
        g.fillText(this.n.toString(), this.x, this.y + 1);
        g.restore();

        g.restore();
      }
    }

    function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.closePath();
    }

    function ellipse(
      g: CanvasRenderingContext2D,
      x: number,
      y: number,
      rx: number,
      ry: number,
      rot = 0
    ) {
      g.beginPath();
      g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      g.closePath();
    }

    function hexToRgb(hex: string) {
      hex = hex.replace('#', '');
      const bigint = parseInt(hex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    }

    function rgbToHex(r: number, g: number, b: number) {
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function shade(hex: string, p: number) {
      const { r, g, b } = hexToRgb(hex);
      return rgbToHex(
        Math.max(0, Math.min(255, Math.round(r * (1 + p)))),
        Math.max(0, Math.min(255, Math.round(g * (1 + p)))),
        Math.max(0, Math.min(255, Math.round(b * (1 + p))))
      );
    }

    function lighten(hex: string, amt: number) {
      return shade(hex, amt);
    }

    for (let n = 1; n <= 98; n++) {
      const color = COLORS[(n - 1) % COLORS.length];
      balls.push(new Ball(n, color));
    }
    
    // Layout grid after all balls are created
    layoutGrid();

    // Mouse interaction - attach to window so it works even when hovering over other elements
    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
      mouseY = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr;
      
      // Check if mouse is over auth div (approximately centered, max-w-md)
      // This is a rough estimate - auth div is typically centered with max-width ~448px
      const authDivX = W / 2;
      const authDivY = H / 2;
      const authDivWidth = Math.min(448, W * 0.9) / (canvas.width / rect.width) * dpr;
      const authDivHeight = 600 / (canvas.height / rect.height) * dpr;
      
      // Check if mouse is within auth div bounds
      const isOverAuthDiv = Math.abs(mouseX - authDivX) < authDivWidth / 2 && 
                            Math.abs(mouseY - authDivY) < authDivHeight / 2;
      
      // Store this for use in ball update
      window._isMouseOverAuthDiv = isOverAuthDiv;
    }

    // Use window event listener so it works even when mouse is over other elements
    window.addEventListener('mousemove', handleMouseMove);

    let animationId: number;

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (const b of balls) {
        b.update();
        b.draw(ctx);
      }
      animationId = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0"
      style={{ background: 'transparent', pointerEvents: 'auto' }}
    />
  );
};

export default NumberAnimation;

