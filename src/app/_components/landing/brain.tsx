"use client";

import { useEffect, useRef } from "react";

// Cérebro 3D do Início em canvas 2D, pintado com as cores dos tokens do tema atual
export function Brain({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startBrain(canvas);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Cérebro 3D laranja feito de pontos e conexões, girando devagar"
      className={`cursor-grab touch-pan-y active:cursor-grabbing ${className ?? ""}`}
    />
  );
}

type Rgb = [number, number, number];
type BrainNode = { x: number; y: number; z: number; part: number; tone: number; ridge: number; activity: number };
type Pulse = { from: number; to: number; progress: number; speed: number; hopsLeft: number };
type Palette = {
  isLight: boolean;
  stops: Rgb[];
  line: Rgb;
  pulse: Rgb;
  halo: [Rgb, Rgb];
  glow: HTMLCanvasElement;
};

const HEMISPHERE_POINTS = 1700;
const CEREBELLUM_POINTS = 260;
const STEM_POINTS = 70;
const MAX_NEIGHBORS = 3;
const NEIGHBOR_DISTANCE_SQUARED = 0.04;
// A célula do ponto e as 26 em volta
const NEIGHBOR_CELL_OFFSETS = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as const)));
const RING_POINTS = 160;
const RING_RADIUS = 1.45;
const RING_TILT = 0.42;
const PULSE_COUNT = 34;
const CAMERA_DISTANCE = 3.6;
const MAX_PIXEL_RATIO = 2;
const AUTO_ROTATION_SPEED = 0.0032;
const RING_ROTATION_SPEED = 0.004;
const DRAG_ROTATION_PER_PIXEL = 0.01;
const PARALLAX_EASING = 0.05;
const ACTIVITY_DECAY = 0.94;
const LIGHT_THEME_DIMMING = 0.86;
// Raio do cérebro, em px de CSS, com que os pontos têm o tamanho do esboço; abaixo dele encolhem até MIN_DETAIL
const FULL_DETAIL_SIZE = 150;
const MIN_DETAIL = 0.45;

// Monta o modelo, liga os eventos e devolve a função que desmonta tudo
function startBrain(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;

  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const model = buildBrainModel();
  const count = model.nodes.length;
  const screenX = new Float32Array(count);
  const screenY = new Float32Array(count);
  const depth = new Float32Array(count);
  const scale = new Float32Array(count);
  const pulses: Pulse[] = prefersReducedMotion ? [] : Array.from({ length: PULSE_COUNT }, () => buildPulse(model.adjacency));

  let palette = readPalette();
  let pixelRatio = 1;
  let unit = 1;
  let rotation = 0.7;
  let ringRotation = 0;
  let parallaxX = 0;
  let parallaxY = 0;
  let targetX = 0;
  let targetY = 0;
  let drag: { startX: number; startRotation: number } | null = null;
  let isOnScreen = true;
  let frameId = 0;

  function drawFrame() {
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return;

    if (!prefersReducedMotion) {
      if (!drag) rotation += AUTO_ROTATION_SPEED;
      ringRotation += RING_ROTATION_SPEED;
    }
    parallaxX += (targetX - parallaxX) * PARALLAX_EASING;
    parallaxY += (targetY - parallaxY) * PARALLAX_EASING;

    const angleY = rotation + parallaxX * 0.5;
    const angleX = -0.22 + parallaxY * 0.3;
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const size = Math.min(width * 0.31, height * 0.4);
    // Pontos e traços encolhem junto com o canvas, para o cérebro pequeno do celular não virar uma mancha
    unit = pixelRatio * Math.min(1, Math.max(MIN_DETAIL, size / pixelRatio / FULL_DETAIL_SIZE));
    const originX = width / 2;
    const originY = height / 2;

    for (let i = 0; i < count; i++) {
      const node = model.nodes[i];
      const x1 = node.x * cosY + node.z * sinY;
      const z1 = -node.x * sinY + node.z * cosY;
      const y1 = node.y * cosX - z1 * sinX;
      const z2 = node.y * sinX + z1 * cosX;
      const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - z2);
      screenX[i] = originX + x1 * size * perspective;
      screenY[i] = originY - y1 * size * perspective;
      depth[i] = z2;
      scale[i] = perspective;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    drawHalo(originX, originY, Math.min(size * 1.7, width / 2, height / 2));

    const ringPoints = model.ring.map(([ringX, , ringZ]) => {
      const cosR = Math.cos(ringRotation);
      const sinR = Math.sin(ringRotation);
      const x = ringX * cosR - ringZ * sinR;
      const z = ringX * sinR + ringZ * cosR;
      const tiltedY = -z * Math.sin(RING_TILT);
      const tiltedZ = z * Math.cos(RING_TILT);
      const x3 = x * cosY + tiltedZ * sinY;
      const z3 = -x * sinY + tiltedZ * cosY;
      const y4 = tiltedY * cosX - z3 * sinX;
      const z4 = tiltedY * sinX + z3 * cosX;
      const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - z4);
      return [originX + x3 * size * perspective, originY - y4 * size * perspective, z4] as const;
    });

    ctx.globalCompositeOperation = palette.isLight ? "source-over" : "lighter";
    drawRing(ringPoints, false);
    drawEdges();
    drawNodes();
    drawPulses();
    drawRing(ringPoints, true);
  }

  function drawHalo(x: number, y: number, radius: number) {
    const [inner, outer] = palette.halo;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
    halo.addColorStop(0, toRgba(inner, 0.3));
    halo.addColorStop(0.5, toRgba(outer, palette.isLight ? 0.12 : 0.08));
    halo.addColorStop(1, toRgba(inner, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Metade de trás do anel antes do cérebro, metade da frente depois
  function drawRing(points: (readonly [number, number, number])[], front: boolean) {
    points.forEach(([x, y, z], index) => {
      if (z > 0 !== front) return;
      const nearness = (z + 1.6) / 3.2;
      const isMarker = index % 40 === 0;
      ctx.fillStyle = toRgba(palette.line, (palette.isLight ? 0.15 : 0.12) + nearness * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, (isMarker ? 2.6 : 0.9) * unit, 0, Math.PI * 2);
      ctx.fill();
      if (isMarker) ctx.drawImage(palette.glow, x - 12 * unit, y - 12 * unit, 24 * unit, 24 * unit);
    });
  }

  // Conexões em 4 faixas de profundidade, um traço por faixa
  function drawEdges() {
    const bands: number[][] = [[], [], [], []];
    for (let k = 0; k < model.edges.length; k += 2) {
      const a = model.edges[k];
      const b = model.edges[k + 1];
      const nearness = ((depth[a] + depth[b]) / 2 + 1.3) / 2.6;
      bands[Math.max(0, Math.min(3, Math.floor(nearness * 4)))].push(a, b);
    }
    bands.forEach((band, bandIndex) => {
      ctx.beginPath();
      for (let k = 0; k < band.length; k += 2) {
        ctx.moveTo(screenX[band[k]], screenY[band[k]]);
        ctx.lineTo(screenX[band[k + 1]], screenY[band[k + 1]]);
      }
      ctx.lineWidth = (0.5 + bandIndex * 0.18) * unit;
      ctx.strokeStyle = toRgba(palette.line, palette.isLight ? 0.07 + bandIndex * 0.09 : 0.05 + bandIndex * 0.08);
      ctx.stroke();
    });
  }

  function drawNodes() {
    const dimming = palette.isLight ? LIGHT_THEME_DIMMING : 1;
    for (let i = 0; i < count; i++) {
      const node = model.nodes[i];
      const nearness = Math.max(0, Math.min(1, (depth[i] + 1.3) / 2.6));
      node.activity *= ACTIVITY_DECAY;
      const [r, g, b] = mixStops(palette.stops, node.tone);
      ctx.fillStyle = toRgba([r * dimming, g * dimming, b * dimming], Math.min(1, (0.2 + 0.65 * nearness) * node.ridge + node.activity));
      ctx.beginPath();
      ctx.arc(screenX[i], screenY[i], (0.4 + 1.4 * nearness * node.ridge + node.activity * 2) * unit * scale[i], 0, Math.PI * 2);
      ctx.fill();
      if (node.activity > 0.2) {
        const glowSize = (10 + 14 * node.activity) * unit;
        ctx.globalAlpha = node.activity;
        ctx.drawImage(palette.glow, screenX[i] - glowSize / 2, screenY[i] - glowSize / 2, glowSize, glowSize);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawPulses() {
    pulses.forEach((pulse, index) => {
      pulse.progress += pulse.speed;
      if (pulse.progress >= 1) {
        model.nodes[pulse.to].activity = 1;
        const next = model.adjacency[pulse.to].filter((j) => j !== pulse.from);
        pulse.hopsLeft -= 1;
        if (pulse.hopsLeft <= 0 || !next.length) {
          pulses[index] = buildPulse(model.adjacency);
          return;
        }
        pulse.from = pulse.to;
        pulse.to = next[Math.floor(Math.random() * next.length)];
        pulse.progress = 0;
      }
      const x = screenX[pulse.from] + (screenX[pulse.to] - screenX[pulse.from]) * pulse.progress;
      const y = screenY[pulse.from] + (screenY[pulse.to] - screenY[pulse.from]) * pulse.progress;
      ctx.strokeStyle = toRgba(palette.pulse, palette.isLight ? 0.8 : 0.85);
      ctx.lineWidth = 1.4 * unit;
      ctx.beginPath();
      ctx.moveTo(screenX[pulse.from], screenY[pulse.from]);
      ctx.lineTo(x, y);
      ctx.stroke();
      const glowSize = 16 * unit * scale[pulse.from];
      ctx.drawImage(palette.glow, x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
    });
  }

  // O laço só roda com o canvas na tela e a aba visível; com menos movimento, desenha um quadro parado
  function loop() {
    drawFrame();
    frameId = requestAnimationFrame(loop);
  }
  function syncLoop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    if (prefersReducedMotion) {
      drawFrame();
      return;
    }
    if (isOnScreen && !document.hidden) frameId = requestAnimationFrame(loop);
  }

  const resizeObserver = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    pixelRatio = Math.min(MAX_PIXEL_RATIO, devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);
    syncLoop();
  });
  resizeObserver.observe(canvas);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isOnScreen = entry.isIntersecting;
    syncLoop();
  });
  visibilityObserver.observe(canvas);

  const themeObserver = new MutationObserver(() => {
    palette = readPalette();
    syncLoop();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // Parallax limitado à área do canvas; arrastar gira
  function followPointer(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (drag) rotation = drag.startRotation + (event.clientX - drag.startX) * DRAG_ROTATION_PER_PIXEL;
  }
  function resetPointer() {
    targetX = 0;
    targetY = 0;
  }
  function startDrag(event: PointerEvent) {
    drag = { startX: event.clientX, startRotation: rotation };
    canvas.setPointerCapture(event.pointerId);
  }
  function stopDrag() {
    drag = null;
  }

  canvas.addEventListener("pointermove", followPointer);
  canvas.addEventListener("pointerleave", resetPointer);
  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);
  document.addEventListener("visibilitychange", syncLoop);

  return () => {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    themeObserver.disconnect();
    canvas.removeEventListener("pointermove", followPointer);
    canvas.removeEventListener("pointerleave", resetPointer);
    canvas.removeEventListener("pointerdown", startDrag);
    canvas.removeEventListener("pointerup", stopDrag);
    canvas.removeEventListener("pointercancel", stopDrag);
    document.removeEventListener("visibilitychange", syncLoop);
  };
}

// Hemisférios com sulcos, fissura no topo, lobo temporal e base arredondada; depois cerebelo, tronco e anel
function buildBrainModel() {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const nodes: BrainNode[] = [];

  spreadOnSphere(HEMISPHERE_POINTS, (dx, dy, dz) => {
    const side = dx >= 0 ? 1 : -1;
    const groove = 0.075 * Math.sin(9 * dz + 5 * dy + side * 1.7) * Math.cos(8 * dy - 4 * dz) + 0.03 * Math.sin(17 * dz - 13 * dy);
    let x = dx * 0.9 * (1 - 0.1 * dz) * (1 + groove);
    let y = dy * 0.74 * (1 + groove);
    let z = dz * 1.18 * (1 + groove);
    if (dy > -0.1) y -= 0.24 * Math.exp(-((dx / 0.14) ** 2)) * (dy + 0.1);
    const temporal = Math.exp(-(((dz - 0.15) / 0.42) ** 2)) * Math.max(0, Math.abs(dx) - 0.35) * Math.max(0, -dy);
    y -= temporal * 0.55;
    if (y < -0.3 && Math.abs(dx) < 0.55) y = -0.3 + (y + 0.3) * (0.45 + Math.abs(dx) * 0.9);
    x += side * 0.05 + random() * 0.025;
    y += random() * 0.025;
    z += random() * 0.025;
    const ridge = Math.min(1, Math.max(0.25, 0.55 + groove * 6));
    nodes.push({ x, y, z, part: side < 0 ? 0 : 1, tone: 0.4 - y * 0.45 - z * 0.25 + groove * 2, ridge, activity: 0 });
  });

  spreadOnSphere(CEREBELLUM_POINTS, (dx, dy, dz) => {
    const fold = 1 + 0.05 * Math.sin(dy * 28);
    const ridge = 0.5 + 0.5 * Math.abs(Math.sin(dy * 28));
    nodes.push({ x: dx * 0.55 * fold, y: -0.48 + dy * 0.25 * fold, z: -0.72 + dz * 0.36 * fold, part: 2, tone: 0.82 - dy * 0.1, ridge, activity: 0 });
  });

  for (let i = 0; i < STEM_POINTS; i++) {
    const angle = i * 2.399;
    const height = i / (STEM_POINTS - 1);
    nodes.push({ x: Math.cos(angle) * 0.11, y: -0.42 - height * 0.5, z: -0.32 + Math.sin(angle) * 0.11 - height * 0.12, part: 3, tone: 0.95, ridge: 0.6, activity: 0 });
  }

  const { edges, adjacency } = buildConnections(nodes);
  const ring = Array.from({ length: RING_POINTS }, (_, i) => {
    const angle = (i / RING_POINTS) * Math.PI * 2;
    return [Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS] as const;
  });
  return { nodes, edges, adjacency, ring };
}

// Liga cada ponto a até 3 vizinhos da mesma parte do cérebro, buscando só nas células próximas da grade para não travar no celular
function buildConnections(nodes: BrainNode[]) {
  const adjacency: number[][] = nodes.map(() => []);
  const edges: number[] = [];
  const seen = new Set<number>();
  const cellSize = Math.sqrt(NEIGHBOR_DISTANCE_SQUARED);
  const cellOf = (value: number) => Math.floor(value / cellSize);
  // Chave numérica: as coordenadas ficam entre -2 e 2, bem dentro das 128 células por eixo
  const cellKey = (x: number, y: number, z: number) => ((x + 64) * 128 + (y + 64)) * 128 + (z + 64);
  const grid = new Map<number, number[]>();
  nodes.forEach((node, index) => {
    const key = cellKey(cellOf(node.x), cellOf(node.y), cellOf(node.z));
    const bucket = grid.get(key);
    if (bucket) bucket.push(index);
    else grid.set(key, [index]);
  });

  for (let i = 0; i < nodes.length; i++) {
    const near: [number, number][] = [];
    const [cx, cy, cz] = [cellOf(nodes[i].x), cellOf(nodes[i].y), cellOf(nodes[i].z)];
    for (const [ox, oy, oz] of NEIGHBOR_CELL_OFFSETS) {
      for (const j of grid.get(cellKey(cx + ox, cy + oy, cz + oz)) ?? []) {
        if (i === j || nodes[i].part !== nodes[j].part) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        if (distanceSquared < NEIGHBOR_DISTANCE_SQUARED) near.push([distanceSquared, j]);
      }
    }
    // Desempate pelo índice, para o resultado não depender da ordem das células
    near.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [, j] of near.slice(0, MAX_NEIGHBORS)) {
      const key = i < j ? i * nodes.length + j : j * nodes.length + i;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(i, j);
      adjacency[i].push(j);
      adjacency[j].push(i);
    }
  }
  return { edges, adjacency };
}

// Espiral de Fibonacci: pontos quase uniformes na esfera unitária
function spreadOnSphere(total: number, place: (x: number, y: number, z: number) => void) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < total; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    place(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
  }
}

function buildPulse(adjacency: number[][]): Pulse {
  const from = Math.floor(Math.random() * HEMISPHERE_POINTS);
  return { from, to: adjacency[from][0] ?? from, progress: 0, speed: 0.03 + Math.random() * 0.04, hopsLeft: 6 + Math.floor(Math.random() * 10) };
}

// Lê os tokens accent, accent-text, accent-deep e text do tema atual
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const isLight = document.documentElement.dataset.theme === "light";
  const accent = parseColor(style.getPropertyValue("--color-accent"));
  const accentText = parseColor(style.getPropertyValue("--color-accent-text"));
  const accentDeep = parseColor(style.getPropertyValue("--color-accent-deep"));
  const text = parseColor(style.getPropertyValue("--color-text"));
  const highlight = isLight ? accentText : mixColors(accentText, text, 0.45);

  return {
    isLight,
    stops: [highlight, accentText, accent, mixColors(accent, accentDeep, 0.5), accentDeep],
    line: isLight ? accentText : mixColors(accentText, accent, 0.4),
    pulse: isLight ? accent : highlight,
    halo: [isLight ? accentText : accent, isLight ? accentText : accentDeep],
    glow: buildGlowSprite(isLight ? accent : text, isLight ? accent : accentText, accent),
  };
}

function buildGlowSprite(inner: Rgb, middle: Rgb, outer: Rgb): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = 64;
  sprite.height = 64;
  const spriteContext = sprite.getContext("2d");
  if (!spriteContext) return sprite;
  const gradient = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, toRgba(inner, 1));
  gradient.addColorStop(0.25, toRgba(middle, 0.5));
  gradient.addColorStop(1, toRgba(outer, 0));
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, 64, 64);
  return sprite;
}

// Os tokens são hex de 6 dígitos no globals.css
function parseColor(value: string): Rgb {
  const hex = value.trim().replace("#", "");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function mixColors(from: Rgb, to: Rgb, amount: number): Rgb {
  return [from[0] + (to[0] - from[0]) * amount, from[1] + (to[1] - from[1]) * amount, from[2] + (to[2] - from[2]) * amount];
}

function mixStops(stops: Rgb[], tone: number): Rgb {
  const position = Math.min(1, Math.max(0, tone)) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  return mixColors(stops[index], stops[index + 1], position - index);
}

function toRgba([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
}
