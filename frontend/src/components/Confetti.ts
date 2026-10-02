/**
 * Confetti: Lightweight high-performance canvas particle burst
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  decay: number;
}

export function launchConfetti(originX?: number, originY?: number): void {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const startX = originX !== undefined ? originX : width / 2;
  const startY = originY !== undefined ? originY : height / 2;

  const particles: Particle[] = [];
  const particleCount = 80;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 9 + 4;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.01
    });
  }

  let animationFrameId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      activeCount++;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (activeCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  render();
}
