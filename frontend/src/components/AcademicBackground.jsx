import { useEffect, useRef } from "react";

// Massive, Multi-Disciplinary High-Contrast Academic Asset Pool
const ACADEMIC_ASSETS = [
  // ── CIVIL ENGINEERING (CE) ──
  { text: 'M_max = (w × L²) / 8', color: 'rgba(251, 146, 60, 0.65)' },    // Structural Bending (Orange)
  { text: 'σ = E × ε (Stress/Strain)', color: 'rgba(249, 115, 22, 0.65)' }, // Elastic Modulus
  { text: 'Concrete Mix: 1:1.5:3', color: 'rgba(226, 232, 240, 0.55)' },     // Aggregate Core Ratio
  { text: 'Shear Force Matrix V(x)', color: 'rgba(251, 146, 60, 0.6)' },
  { text: 'Bearing Capacity q_ult', color: 'rgba(217, 119, 6, 0.65)' },

  // ── BUSINESS ADMINISTRATION (BBA) ──
  { text: 'Assets = Liabilities + Equity', color: 'rgba(34, 211, 238, 0.65)' }, // Balance Sheet (Cyan)
  { text: 'ROI = (Net Profit / Capital) × 100%', color: 'rgba(45, 212, 191, 0.7)' }, // Yield Ratio
  { text: 'Supply & Demand Equilibrium ⚖️', color: 'rgba(6, 182, 212, 0.62)' },
  { text: 'CAGR Growth Matrix ↑', color: 'rgba(14, 165, 233, 0.65)' },
  { text: 'Market Cap Evaluation', color: 'rgba(56, 189, 248, 0.6)' },

  // ── ELECTRICAL & ELECTRONIC ENGINEERING (EEE) ──
  { text: 'V = I × R (Ohm\'s Law)', color: 'rgba(252, 211, 77, 0.7)' },       // Electric Field (Yellow/Amber)
  { text: '∑ I_in = ∑ I_out (KCL Link)', color: 'rgba(245, 158, 11, 0.68)' },  // Kirchhoff's Current Law
  { text: 'X_L = 2πfL (Inductive Loop)', color: 'rgba(253, 224, 71, 0.65)' },   // Reactance Circuit
  { text: 'Transistor Gain β = Ic / Ib', color: 'rgba(252, 211, 77, 0.6)' },
  { text: 'LC Resonant Tank Circuit', color: 'rgba(234, 179, 8, 0.65)' },

  // ── MECHANICAL ENGINEERING (ME) ──
  { text: 'PV = nRT (Ideal Gas Model)', color: 'rgba(244, 63, 94, 0.68)' },     // Thermodynamics (Crimson/Rose)
  { text: 'Re = (ρ × v × D) / μ', color: 'rgba(251, 113, 133, 0.65)' },         // Reynolds Number Fluidics
  { text: 'Efficiency η = 1 - (Tc / Th)', color: 'rgba(225, 29, 72, 0.7)' },    // Carnot Cycle
  { text: 'Torque Vector τ = r × F', color: 'rgba(244, 63, 94, 0.6)' },
  { text: 'Gear Velocity Ratio N1/N2', color: 'rgba(253, 164, 175, 0.65)' },

  // ── COMPUTER SCIENCE (CSE) ──
  { text: 'printf("Hello BAUST");', color: 'rgba(52, 211, 153, 0.7)' },       // Algorithmic (Emerald/Green)
  { text: 'def train_model(epochs):', color: 'rgba(74, 222, 128, 0.65)' },
  { text: 'std::cout << "Compile";', color: 'rgba(16, 185, 129, 0.68)' },
  { text: 'O(N log N) Sort Pipeline', color: 'rgba(110, 231, 183, 0.62)' },

  // ── ADVANCED MATH EQUATIONS ──
  { text: 'e^(iπ) + 1 = 0 (Euler)', color: 'rgba(167, 139, 250, 0.7)' },        // Higher Calculus (Purple/Indigo)
  { text: '∫ e^x dx = e^x + C', color: 'rgba(129, 140, 248, 0.68)' },
  { text: '∇ × E = -∂B / ∂t (Maxwell)', color: 'rgba(99, 102, 241, 0.65)' },
  { text: 'f\'(x) = lim [h→0] (f(x+h)-f(x))/h', color: 'rgba(139, 92, 246, 0.62)' },
  { text: 'Matrix det(A) = ad - bc', color: 'rgba(192, 132, 252, 0.65)' },
];

export default function AcademicBackground() {
  const canvasRef = useRef(null);
  const textParticlesRef = useRef([]);
  const nodesRef = useRef([]);
  const helicesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"];

    // Initialize Bigger, Multi-Directional Oscillating Text Elements
    const textCount = window.innerWidth < 640 ? 16 : 32; // Increased count to balance the grid
    textParticlesRef.current = Array.from({ length: textCount }).map(() => {
      const asset = ACADEMIC_ASSETS[Math.floor(Math.random() * ACADEMIC_ASSETS.length)];
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      
      return {
        text: asset.text,
        color: asset.color,
        dir: dir,
        baseX: Math.random() * window.innerWidth,
        baseY: Math.random() * window.innerHeight,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 0.35 + Math.random() * 0.55,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: 0.01 + Math.random() * 0.016,
        amplitude: 35 + Math.random() * 45,          // Wiggle Travel Margin
        fontSize: window.innerWidth < 640 ? 15 : 18, // Large, high-readability font sizing
        slipped: false,
        vx: 0,
        vy: 0,
        width: 0,
      };
    });

    // Initialize Flowing Neural Network Blocks
    const nodeCount = window.innerWidth < 640 ? 35 : 75;
    nodesRef.current = Array.from({ length: nodeCount }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.35,
    }));

    // Initialize Distributed Localized 3D DNA Mini-Helices
    const helixCount = window.innerWidth < 640 ? 4 : 7; // Distributed many micro helices
    helicesRef.current = Array.from({ length: helixCount }).map((_, i) => {
      const spacingSegment = window.innerWidth / (helixCount + 1);
      return {
        baseX: spacingSegment * (i + 1) + (Math.random() - 0.5) * 80,
        radius: window.innerWidth < 640 ? 12 : 18, // Small, elegant, localized helix width
        rotation: Math.random() * Math.PI,
        rotationSpeed: 0.008 + Math.random() * 0.012,
        verticalSpacing: window.innerWidth < 640 ? 30 : 36,
        phaseShift: 0.32 + Math.random() * 0.08,
        opacityScale: 0.35 + Math.random() * 0.55, // Multi-depth field distribution
      };
    });

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // ── 1. NEURAL NETWORK BLOCK INTERCONNECTIONS ──
      nodesRef.current.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > window.innerWidth) node.vx *= -1;
        if (node.y < 0 || node.y > window.innerHeight) node.vy *= -1;

        ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const dx = nodesRef.current[i].x - nodesRef.current[j].x;
          const dy = nodesRef.current[i].y - nodesRef.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodesRef.current[i].x, nodesRef.current[i].y);
            ctx.lineTo(nodesRef.current[j].x, nodesRef.current[j].y);
            ctx.strokeStyle = `rgba(52, 211, 153, ${0.24 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // ── 2. MULTIPLE DISTRIBUTED 3D DNA HELICES ──
      helicesRef.current.forEach((helix) => {
        helix.rotation += helix.rotationSpeed;
        const steps = Math.floor(window.innerHeight / helix.verticalSpacing);

        for (let i = 0; i < steps; i++) {
          const y = i * helix.verticalSpacing + 20;
          const currentAngle = i * helix.phaseShift + helix.rotation;

          const z1 = Math.cos(currentAngle);
          const z2 = Math.cos(currentAngle + Math.PI);

          const x1 = helix.baseX + Math.sin(currentAngle) * helix.radius;
          const x2 = helix.baseX + Math.sin(currentAngle + Math.PI) * helix.radius;

          const scale1 = (z1 + 2) / 3; 
          const scale2 = (z2 + 2) / 3;

          // Connecting cross rungs
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.strokeStyle = `rgba(148, 163, 184, ${helix.opacityScale * (0.05 + Math.min(scale1, scale2) * 0.08)})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Cyan Helix Backbone Component
          ctx.fillStyle = `rgba(6, 182, 212, ${helix.opacityScale * (0.18 + scale1 * 0.5)})`;
          ctx.beginPath();
          ctx.arc(x1, y, 1.5 + scale1 * 2, 0, Math.PI * 2);
          ctx.fill();

          // Magenta/Purple Antiparallel Component
          ctx.fillStyle = `rgba(168, 85, 247, ${helix.opacityScale * (0.18 + scale2 * 0.5)})`;
          ctx.beginPath();
          ctx.arc(x2, y, 1.5 + scale2 * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ── 3. OMNIDIRECTIONAL WIGGLING DESIGN MATRIX (KINETIC TEXT) ──
      textParticlesRef.current.forEach((p) => {
        if (!p.slipped) {
          p.angle += p.angleSpeed;
          const wiggle = Math.sin(p.angle) * p.amplitude;

          switch (p.dir) {
            case "UP":
              p.y -= p.speed;
              p.x = p.baseX + wiggle;
              if (p.y < -40) { p.y = window.innerHeight + 40; p.baseX = Math.random() * window.innerWidth; }
              break;
            case "DOWN":
              p.y += p.speed;
              p.x = p.baseX + wiggle;
              if (p.y > window.innerHeight + 40) { p.y = -40; p.baseX = Math.random() * window.innerWidth; }
              break;
            case "LEFT":
              p.x -= p.speed;
              p.y = p.baseY + wiggle;
              if (p.x < -300) { p.x = window.innerWidth + 40; p.baseY = Math.random() * window.innerHeight; }
              break;
            case "RIGHT":
              p.x += p.speed;
              p.y = p.baseY + wiggle;
              if (p.x > window.innerWidth + 40) { p.x = -300; p.baseY = Math.random() * window.innerHeight; }
              break;
          }
        } else {
          p.x += p.vx;
          p.y += p.vy;
        }

        ctx.font = `bold ${p.fontSize}px monospace`;
        ctx.fillStyle = p.color;
        p.width = ctx.measureText(p.text).width;
        ctx.fillText(p.text, p.x, p.y);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const checkInteraction = (clientX, clientY) => {
    textParticlesRef.current.forEach((p) => {
      if (p.slipped) return;

      if (
        clientX >= p.x - 15 &&
        clientX <= p.x + p.width + 15 &&
        clientY >= p.y - p.fontSize - 5 &&
        clientY <= p.y + 8
      ) {
        p.slipped = true;
        const vectors = [
          { vx: 15, vy: -5 },
          { vx: -15, vy: -5 },
          { vx: 9,  vy: 12 },
          { vx: -9, vy: 12 },
        ];
        const chosen = vectors[Math.floor(Math.random() * vectors.length)];
        p.vx = chosen.vx;
        p.vy = chosen.vy;
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={(e) => checkInteraction(e.clientX, e.clientY)}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          checkInteraction(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      className="absolute inset-0 z-0 block h-full w-full bg-slate-950 pointer-events-auto cursor-default"
    />
  );
}