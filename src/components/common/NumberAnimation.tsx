import React, { useEffect, useRef } from 'react';

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
      if (balls.length === 90) {
        layoutGrid();
      }
    }

    window.addEventListener('resize', resize);
    resize();

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function layoutGrid() {
      const totalBalls = 90;
      if (balls.length !== totalBalls) return;
      
      // Calculate optimal grid dimensions
      const aspectRatio = W / H;
      const cols = Math.ceil(Math.sqrt(totalBalls * aspectRatio));
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
        // Calculate distance from mouse to current position
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 120; // Maximum distance for interaction
        
        if (dist < maxDist && dist > 5) {
          // Calculate attraction strength (stronger when closer)
          const strength = (1 - dist / maxDist) * 0.6;
          const angle = Math.atan2(dy, dx);
          
          // Move towards mouse position
          const moveDistance = dist * strength * 0.3;
          const targetX = this.x + Math.cos(angle) * moveDistance;
          const targetY = this.y + Math.sin(angle) * moveDistance;
          
          // Smooth interpolation towards target
          this.vx = (targetX - this.x) * 0.2;
          this.vy = (targetY - this.y) * 0.2;
        } else {
          // Return to base position smoothly
          const returnSpeed = 0.12;
          this.vx = (this.baseX - this.x) * returnSpeed;
          this.vy = (this.baseY - this.y) * returnSpeed;
        }
        
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

    for (let n = 1; n <= 90; n++) {
      const color = COLORS[(n - 1) % COLORS.length];
      balls.push(new Ball(n, color));
    }
    
    // Layout grid after all balls are created
    layoutGrid();

    // Mouse interaction
    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
      mouseY = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr;
    }

    canvas.addEventListener('mousemove', handleMouseMove);

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
      canvas.removeEventListener('mousemove', handleMouseMove);
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

