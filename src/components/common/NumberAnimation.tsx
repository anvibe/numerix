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
    const dice: Die[] = [];
    const R = 18;
    const DIE_SIZE = 24;
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
      
      // Layout dice randomly
      for (let d = 0; d < dice.length; d++) {
        const die = dice[d];
        die.x = rand(DIE_SIZE + 10, W - DIE_SIZE - 10);
        die.y = rand(DIE_SIZE + 10, H - DIE_SIZE - 10);
        die.vx = 0;
        die.vy = 0;
        die.rotation = rand(0, Math.PI * 2);
        die.rotationSpeed = rand(-0.05, 0.05);
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

    class Die {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      value: number;
      rotation: number;
      rotationSpeed: number;
      color: string;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.size = DIE_SIZE + rand(-2, 2);
        this.value = Math.floor(rand(1, 7));
        this.rotation = rand(0, Math.PI * 2);
        this.rotationSpeed = rand(-0.05, 0.05);
        this.color = color;
      }

      update() {
        this.vy += GRAVITY;
        this.vx *= DRAG;
        this.vy *= DRAG;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        const halfSize = this.size / 2;
        if (this.x < halfSize) {
          this.x = halfSize;
          this.vx = -this.vx * BOUNCE;
          this.rotationSpeed *= -1;
        }
        if (this.x > W - halfSize) {
          this.x = W - halfSize;
          this.vx = -this.vx * BOUNCE;
          this.rotationSpeed *= -1;
        }
        if (this.y < halfSize) {
          this.y = halfSize;
          this.vy = -this.vy * BOUNCE;
          this.rotationSpeed *= -1;
        }
        if (this.y > H - halfSize) {
          this.y = H - halfSize;
          this.vy = -this.vy * BOUNCE;
          this.rotationSpeed *= -1;
        }
      }

      draw(g: CanvasRenderingContext2D) {
        const s = this.size;
        const halfS = s / 2;
        
        g.save();
        g.translate(this.x, this.y);
        g.rotate(this.rotation);

        // Draw 3D cube faces
        const depth = s * 0.3;
        const lightColor = lighten(this.color, 0.3);
        const darkColor = shade(this.color, -0.4);

        // Top face
        g.fillStyle = lightColor;
        g.beginPath();
        g.moveTo(-halfS, -halfS);
        g.lineTo(halfS, -halfS);
        g.lineTo(halfS + depth, -halfS - depth);
        g.lineTo(-halfS + depth, -halfS - depth);
        g.closePath();
        g.fill();

        // Right face
        g.fillStyle = this.color;
        g.beginPath();
        g.moveTo(halfS, -halfS);
        g.lineTo(halfS, halfS);
        g.lineTo(halfS + depth, halfS - depth);
        g.lineTo(halfS + depth, -halfS - depth);
        g.closePath();
        g.fill();

        // Front face
        g.fillStyle = lighten(this.color, 0.1);
        g.shadowColor = 'rgba(0,0,0,0.35)';
        g.shadowBlur = 8;
        g.shadowOffsetY = 3;
        g.fillRect(-halfS, -halfS, s, s);

        // Draw dots
        g.fillStyle = '#fff';
        g.shadowBlur = 0;
        const dotRadius = s * 0.08;
        const spacing = s * 0.25;

        const dots: [number, number][] = [];
        switch (this.value) {
          case 1:
            dots.push([0, 0]);
            break;
          case 2:
            dots.push([-spacing, -spacing], [spacing, spacing]);
            break;
          case 3:
            dots.push([-spacing, -spacing], [0, 0], [spacing, spacing]);
            break;
          case 4:
            dots.push([-spacing, -spacing], [spacing, -spacing], [-spacing, spacing], [spacing, spacing]);
            break;
          case 5:
            dots.push([-spacing, -spacing], [spacing, -spacing], [0, 0], [-spacing, spacing], [spacing, spacing]);
            break;
          case 6:
            dots.push([-spacing, -spacing], [spacing, -spacing], [-spacing, 0], [spacing, 0], [-spacing, spacing], [spacing, spacing]);
            break;
        }

        dots.forEach(([x, y]) => {
          g.beginPath();
          g.arc(x, y, dotRadius, 0, Math.PI * 2);
          g.fill();
        });

        // Draw border
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.lineWidth = 1.5;
        g.strokeRect(-halfS, -halfS, s, s);

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

    // Add 15 dice
    for (let i = 0; i < 15; i++) {
      const color = COLORS[i % COLORS.length];
      dice.push(new Die(rand(DIE_SIZE + 10, W - DIE_SIZE - 10), rand(DIE_SIZE + 10, H - DIE_SIZE - 10), color));
    }
    
    layoutGrid();

    function repel() {
      // Repel balls
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
      
      // Repel dice
      for (let i = 0; i < dice.length; i++) {
        for (let j = i + 1; j < dice.length; j++) {
          const a = dice[i];
          const b = dice[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const min = (a.size + b.size) * 0.9;

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
      
      // Repel balls and dice
      for (let i = 0; i < balls.length; i++) {
        for (let j = 0; j < dice.length; j++) {
          const a = balls[i];
          const b = dice[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const min = (a.r + b.size / 2) * 0.9;

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
      for (const d of dice) d.update();
      repel();
      for (const b of balls) b.draw(ctx);
      for (const d of dice) d.draw(ctx);
      animationId = requestAnimationFrame(tick);
    }
    tick();

    setTimeout(() => {
      GRAVITY = 0.04;
      balls.forEach((b) => {
        b.vx = rand(-0.4, 0.4);
      });
      dice.forEach((d) => {
        d.vx = rand(-0.5, 0.5);
        d.rotationSpeed = rand(-0.08, 0.08);
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

