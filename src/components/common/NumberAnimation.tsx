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
    let GRAVITY = 0.0;
    const DRAG = 0.999;
    const BOUNCE = 0.96;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function layoutGrid() {
      const cols = Math.ceil(Math.sqrt(90 * (W / H)));
      const rows = Math.ceil(90 / cols);
      const gridW = W - 2 * R - 20;
      const gridH = H - 2 * R - 20;
      const cellW = gridW / Math.max(1, cols - 1);
      const cellH = gridH / Math.max(1, rows - 1);
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols && i < balls.length; c++, i++) {
          const b = balls[i];
          b.x = R + 10 + c * cellW;
          b.y = R + 10 + r * cellH;
          b.vx = 0;
          b.vy = 0;
        }
      }
    }

    class Ball {
      n: number;
      color: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;

      constructor(n: number, color: string) {
        this.n = n;
        this.color = color;
        this.x = rand(R + 10, W - R - 10);
        this.y = rand(R + 10, H - R - 10);
        this.vx = 0;
        this.vy = 0;
        this.r = R + rand(-2, 2);
      }

      update() {
        this.vy += GRAVITY;
        this.vx *= DRAG;
        this.vy *= DRAG;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.r) {
          this.x = this.r;
          this.vx = -this.vx * BOUNCE;
        }
        if (this.x > W - this.r) {
          this.x = W - this.r;
          this.vx = -this.vx * BOUNCE;
        }
        if (this.y < this.r) {
          this.y = this.r;
          this.vy = -this.vy * BOUNCE;
        }
        if (this.y > H - this.r) {
          this.y = H - this.r;
          this.vy = -this.vy * BOUNCE;
        }
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
    layoutGrid();

    function repel() {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const min = (a.r + b.r) * 0.94;

          if (dist > 0 && dist < min) {
            const overlap = (min - dist) * 0.5;
            const ux = dx / dist;
            const uy = dy / dist;
            a.x -= ux * overlap;
            a.y -= uy * overlap;
            b.x += ux * overlap;
            b.y += uy * overlap;
            const vproj = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
            a.vx += vproj * ux * 0.25;
            a.vy += vproj * uy * 0.25;
            b.vx -= vproj * ux * 0.25;
            b.vy -= vproj * uy * 0.25;
          }
        }
      }
    }

    let animationId: number;

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (const b of balls) b.update();
      repel();
      for (const b of balls) b.draw(ctx);
      animationId = requestAnimationFrame(tick);
    }
    tick();

    setTimeout(() => {
      GRAVITY = 0.04;
      balls.forEach((b) => {
        b.vx = rand(-0.4, 0.4);
      });
    }, 1200);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default NumberAnimation;

