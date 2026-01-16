import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

const OCEAN_SIZE = 200;
const WAVE_SEGMENTS = 48;

function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  
  const initialPositions = useMemo(() => {
    const positions: number[] = [];
    const segmentSize = OCEAN_SIZE / WAVE_SEGMENTS;
    for (let i = 0; i <= WAVE_SEGMENTS; i++) {
      for (let j = 0; j <= WAVE_SEGMENTS; j++) {
        positions.push(i * segmentSize - OCEAN_SIZE / 2);
        positions.push(0);
        positions.push(j * segmentSize - OCEAN_SIZE / 2);
      }
    }
    return new Float32Array(positions);
  }, []);

  useFrame((state) => {
    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = initialPositions[i];
        const z = initialPositions[i + 2];
        positions[i + 1] = 
          Math.sin(x * 0.08 + time * 0.7) * 0.25 +
          Math.sin(z * 0.1 + time * 0.5) * 0.2 +
          Math.sin((x + z) * 0.06 + time * 0.3) * 0.12;
      }
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry ref={geometryRef} args={[OCEAN_SIZE, OCEAN_SIZE, WAVE_SEGMENTS, WAVE_SEGMENTS]} />
      <meshStandardMaterial 
        color="#0077BE"
        emissive="#004080"
        emissiveIntensity={0.15}
        metalness={0.5}
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function OceanFoam() {
  const foamPatches = useMemo(() => {
    const patches: { x: number; z: number; scale: number; offset: number }[] = [];
    for (let i = 0; i < 30; i++) {
      patches.push({
        x: ((i * 17.3) % 50) - 25,
        z: ((i * 23.7) % 80) - 40,
        scale: 0.6 + (i * 0.7) % 1.2,
        offset: (i * 1.3) % (Math.PI * 2)
      });
    }
    return patches;
  }, []);

  return (
    <group position={[0, 0.05, 0]}>
      {foamPatches.map((patch, i) => (
        <FoamPatch key={i} position={[patch.x, 0, patch.z]} scale={patch.scale} offset={patch.offset} />
      ))}
    </group>
  );
}

function FoamPatch({ position, scale, offset }: { position: [number, number, number]; scale: number; offset: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale * (0.8 + Math.sin(state.clock.elapsedTime * 1.5 + offset) * 0.2));
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.8, 10]} />
      <meshStandardMaterial 
        color="#FFFFFF"
        emissive="#E0F7FA"
        emissiveIntensity={0.2}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

function Island({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={size}>
      <mesh castShadow>
        <coneGeometry args={[1.8, 1.2, 8]} />
        <meshStandardMaterial color="#F4A460" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <coneGeometry args={[0.25, 1.8, 6]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[-0.4, 0.8, 0.4]} castShadow>
        <coneGeometry args={[0.2, 1.3, 6]} />
        <meshStandardMaterial color="#2E8B2E" />
      </mesh>
      <mesh position={[0.35, 0.75, -0.25]} castShadow>
        <coneGeometry args={[0.18, 1.1, 6]} />
        <meshStandardMaterial color="#32CD32" />
      </mesh>
    </group>
  );
}

function Rock({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={size}>
      <mesh castShadow>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#696969" roughness={0.8} />
      </mesh>
      <mesh position={[0.25, 0.15, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#808080" roughness={0.9} />
      </mesh>
    </group>
  );
}

function FloatingTreasure({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.12;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.28, 0.28]} />
        <meshStandardMaterial color="#8B4513" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.42, 0.1, 0.3]} />
        <meshStandardMaterial color="#A0522D" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0.15]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.7} metalness={0.9} />
      </mesh>
      <SparkleEffect position={[0, 0.35, 0]} />
    </group>
  );
}

function SparkleEffect({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.15, Math.sin(i * Math.PI / 2) * 0.15, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial 
            color="#FFFF00" 
            emissive="#FFD700" 
            emissiveIntensity={2}
          />
        </mesh>
      ))}
    </group>
  );
}

function Cloud({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseX = position[0];
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = baseX + Math.sin(state.clock.elapsedTime * 0.08) * 1.5;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F0F8FF" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[1.2, 0.2, 0]}>
        <sphereGeometry args={[1.1, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F0F8FF" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-1.1, 0.15, 0]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F0F8FF" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#F0F8FF" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Seagull({ position, speed = 1 }: { position: [number, number, number]; speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const startX = position[0];
  
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime * speed;
      groupRef.current.position.x = startX + Math.sin(t * 0.4) * 8;
      groupRef.current.position.y = position[1] + Math.sin(t * 1.8) * 0.4;
      groupRef.current.rotation.z = Math.sin(t * 2.5) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.04, 0.12]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.04, 0.12]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function DiscoveryMarker({ position, type }: { position: [number, number, number]; type: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.08;
      groupRef.current.rotation.y = state.clock.elapsedTime * 1.5;
    }
  });

  const getColor = () => {
    if (type.includes("multiplier")) return "#FFD700";
    if (type === "hazard") return "#FF4444";
    if (type === "bonus_chest") return "#8B4513";
    if (type === "reset_trap") return "#00BCD4";
    return "#4CAF50";
  };

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <torusGeometry args={[0.4, 0.08, 8, 16]} />
        <meshStandardMaterial 
          color={getColor()} 
          emissive={getColor()} 
          emissiveIntensity={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>
      <pointLight position={[0, 0.3, 0]} color={getColor()} intensity={0.5} distance={3} />
    </group>
  );
}

export function GameBoard() {
  const { currentPosition, board } = useGameState();
  const worldGroupRef = useRef<THREE.Group>(null);
  
  const sceneElements = useMemo(() => {
    const elements: { type: string; x: number; z: number; size: number }[] = [];
    
    for (let i = 0; i < 20; i++) {
      elements.push({
        type: "island",
        x: ((i * 13.7) % 40) - 20,
        z: -i * 12 - 8,
        size: 0.5 + (i * 0.3) % 0.7
      });
    }
    
    for (let i = 0; i < 25; i++) {
      elements.push({
        type: "rock",
        x: ((i * 11.3) % 50) - 25,
        z: -i * 10 - 5,
        size: 0.4 + (i * 0.2) % 0.5
      });
    }
    
    for (let i = 0; i < 12; i++) {
      elements.push({
        type: "treasure",
        x: ((i * 17.9) % 35) - 17,
        z: -i * 18 - 12,
        size: 1
      });
    }
    
    return elements;
  }, []);

  const clouds = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      x: ((i * 23.7) % 70) - 35,
      y: 12 + (i * 2.8) % 8,
      z: -i * 20 - 15,
      scale: 0.7 + (i * 0.35) % 0.5
    }));
  }, []);

  const seagulls = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: ((i * 19.3) % 50) - 25,
      y: 6 + (i * 1.8) % 4,
      z: -i * 25 - 8,
      speed: 0.7 + (i * 0.25) % 0.4
    }));
  }, []);

  useFrame(() => {
    if (worldGroupRef.current) {
      const targetZ = currentPosition * 2;
      worldGroupRef.current.position.z = THREE.MathUtils.lerp(
        worldGroupRef.current.position.z,
        targetZ,
        0.08
      );
    }
  });

  return (
    <group>
      <Ocean />
      <OceanFoam />
      
      <group ref={worldGroupRef}>
        {sceneElements.map((el, i) => {
          if (el.type === "island") {
            return <Island key={`island-${i}`} position={[el.x, 0.3, el.z]} size={el.size} />;
          }
          if (el.type === "rock") {
            return <Rock key={`rock-${i}`} position={[el.x, 0.15, el.z]} size={el.size} />;
          }
          if (el.type === "treasure") {
            return <FloatingTreasure key={`treasure-${i}`} position={[el.x, 0.4, el.z]} />;
          }
          return null;
        })}
        
        {clouds.map((cloud, i) => (
          <Cloud key={`cloud-${i}`} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale} />
        ))}
        
        {seagulls.map((bird, i) => (
          <Seagull key={`seagull-${i}`} position={[bird.x, bird.y, bird.z]} speed={bird.speed} />
        ))}
        
        {board.map((step: { position: number; type: string }, i: number) => {
          if (step.type !== "safe") {
            const stepZ = -step.position * 2;
            return (
              <DiscoveryMarker 
                key={`marker-${step.position}`} 
                position={[0, 0.3, stepZ]} 
                type={step.type}
              />
            );
          }
          return null;
        })}
      </group>
    </group>
  );
}
