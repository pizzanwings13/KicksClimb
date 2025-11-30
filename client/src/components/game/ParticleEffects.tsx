import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

function createParticles(
  count: number,
  origin: THREE.Vector3,
  color: THREE.Color,
  spread: number = 2,
  speed: number = 3
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const upAngle = Math.random() * Math.PI * 0.5;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * Math.sin(upAngle) * speed * (0.5 + Math.random()),
      Math.cos(upAngle) * speed * (0.5 + Math.random() * 0.5),
      Math.sin(angle) * Math.sin(upAngle) * speed * (0.5 + Math.random())
    );
    particles.push({
      position: origin.clone(),
      velocity,
      color: color.clone(),
      size: 0.1 + Math.random() * 0.15,
      life: 1,
      maxLife: 0.8 + Math.random() * 0.4,
    });
  }
  return particles;
}

export function WinParticles({ position }: { position: THREE.Vector3 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const goldColors = [
      new THREE.Color("#FFD700"),
      new THREE.Color("#FFA500"),
      new THREE.Color("#FFFF00"),
    ];
    const allParticles: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      allParticles.push(
        ...createParticles(25, position, goldColors[i % goldColors.length], 2, 4)
      );
    }
    setParticles(allParticles);
  }, [position]);

  useFrame((_, delta) => {
    if (!active || particles.length === 0) return;

    let allDead = true;
    particles.forEach((p) => {
      p.life -= delta / p.maxLife;
      if (p.life > 0) {
        allDead = false;
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 9.8 * delta * 0.3;
      }
    });

    if (allDead) {
      setActive(false);
      return;
    }

    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
      const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;

      particles.forEach((p, i) => {
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        colors[i * 3] = p.color.r;
        colors[i * 3 + 1] = p.color.g;
        colors[i * 3 + 2] = p.color.b;
        sizes[i] = p.size * Math.max(0, p.life);
      });

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
      pointsRef.current.geometry.attributes.size.needsUpdate = true;
    }
  });

  const { positions, colors, sizes } = useMemo(() => {
    const count = 75;
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
    };
  }, []);

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={75}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={75}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={75}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function LoseParticles({ position }: { position: THREE.Vector3 }) {
  const pointsRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const darkColors = [
      new THREE.Color("#FF0000"),
      new THREE.Color("#8B0000"),
      new THREE.Color("#FF4500"),
    ];
    const allParticles: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      allParticles.push(
        ...createParticles(20, position, darkColors[i % darkColors.length], 1.5, 2)
      );
    }
    setParticles(allParticles);
  }, [position]);

  useFrame((_, delta) => {
    if (!active || particles.length === 0) return;

    let allDead = true;
    particles.forEach((p) => {
      p.life -= delta / p.maxLife;
      if (p.life > 0) {
        allDead = false;
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 9.8 * delta * 0.5;
      }
    });

    if (allDead) {
      setActive(false);
      return;
    }

    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
      const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;

      particles.forEach((p, i) => {
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        colors[i * 3] = p.color.r * p.life;
        colors[i * 3 + 1] = p.color.g * p.life;
        colors[i * 3 + 2] = p.color.b * p.life;
        sizes[i] = p.size * Math.max(0, p.life);
      });

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
      pointsRef.current.geometry.attributes.size.needsUpdate = true;
    }
  });

  const { positions, colors, sizes } = useMemo(() => {
    const count = 60;
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
    };
  }, []);

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={60}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={60}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={60}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function MultiplierParticles({ position, multiplier }: { position: THREE.Vector3; multiplier: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const color = multiplier >= 10 
      ? new THREE.Color("#FF00FF") 
      : multiplier >= 5 
        ? new THREE.Color("#00FFFF")
        : multiplier >= 3
          ? new THREE.Color("#00FF00")
          : new THREE.Color("#FFFF00");
    
    const particleCount = 15 + multiplier * 5;
    setParticles(createParticles(particleCount, position, color, 1.5, 3));
  }, [position, multiplier]);

  useFrame((_, delta) => {
    if (!active || particles.length === 0) return;

    let allDead = true;
    particles.forEach((p) => {
      p.life -= delta / p.maxLife;
      if (p.life > 0) {
        allDead = false;
        p.position.add(p.velocity.clone().multiplyScalar(delta));
        p.velocity.y -= 5 * delta;
      }
    });

    if (allDead) {
      setActive(false);
      return;
    }

    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
      const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;

      particles.forEach((p, i) => {
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        colors[i * 3] = p.color.r;
        colors[i * 3 + 1] = p.color.g;
        colors[i * 3 + 2] = p.color.b;
        sizes[i] = p.size * Math.max(0, p.life) * (1 + Math.sin(p.life * 10) * 0.2);
      });

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
      pointsRef.current.geometry.attributes.size.needsUpdate = true;
    }
  });

  const count = 15 + 10 * 5;
  const { positions, colors, sizes } = useMemo(() => {
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
    };
  }, [count]);

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.18}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

interface ParticleEffect {
  id: string;
  type: "win" | "lose" | "multiplier";
  position: THREE.Vector3;
  multiplier?: number;
}

export function ParticleEffectsManager() {
  const [effects, setEffects] = useState<ParticleEffect[]>([]);
  const phase = useGameState((state) => state.phase);
  const lastStepType = useGameState((state) => state.lastStepType);
  const currentPosition = useGameState((state) => state.currentPosition);
  const currentMultiplier = useGameState((state) => state.currentMultiplier);
  
  const prevPhaseRef = useRef(phase);
  const prevPositionRef = useRef(currentPosition);

  const getPlayerPosition = (step: number): THREE.Vector3 => {
    const stepsPerRow = 10;
    const row = Math.floor(step / stepsPerRow);
    const col = step % stepsPerRow;
    const isReversed = row % 2 === 1;
    const x = isReversed ? (stepsPerRow - 1 - col) - (stepsPerRow - 1) / 2 : col - (stepsPerRow - 1) / 2;
    return new THREE.Vector3(x * 1.2, 1.5, row * 1.2 - 5);
  };

  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      const playerPos = getPlayerPosition(currentPosition);
      
      if (phase === "won" || phase === "cashed_out") {
        setEffects((prev) => [
          ...prev,
          { id: `win-${Date.now()}`, type: "win", position: playerPos },
        ]);
      }
      
      if (phase === "lost") {
        setEffects((prev) => [
          ...prev,
          { id: `lose-${Date.now()}`, type: "lose", position: playerPos },
        ]);
      }
      
      prevPhaseRef.current = phase;
    }
  }, [phase, currentPosition]);

  useEffect(() => {
    if (currentPosition !== prevPositionRef.current && currentPosition > 0) {
      const playerPos = getPlayerPosition(currentPosition);
      
      if (lastStepType?.startsWith("multiplier_") || lastStepType === "finish") {
        const mult = lastStepType === "finish" ? 20 : 
          lastStepType === "multiplier_10x" ? 10 :
          lastStepType === "multiplier_5x" ? 5 :
          lastStepType === "multiplier_3x" ? 3 : 2;
        
        setEffects((prev) => [
          ...prev,
          { id: `mult-${Date.now()}`, type: "multiplier", position: playerPos, multiplier: mult },
        ]);
      }
      
      prevPositionRef.current = currentPosition;
    }
  }, [currentPosition, lastStepType]);

  useEffect(() => {
    if (effects.length > 0) {
      const timer = setTimeout(() => {
        setEffects((prev) => prev.slice(1));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [effects]);

  return (
    <>
      {effects.map((effect) => {
        if (effect.type === "win") {
          return <WinParticles key={effect.id} position={effect.position} />;
        }
        if (effect.type === "lose") {
          return <LoseParticles key={effect.id} position={effect.position} />;
        }
        if (effect.type === "multiplier") {
          return (
            <MultiplierParticles
              key={effect.id}
              position={effect.position}
              multiplier={effect.multiplier || 2}
            />
          );
        }
        return null;
      })}
    </>
  );
}
