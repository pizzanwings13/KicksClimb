import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Lights() {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const sunRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.intensity = 0.6 + Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.5} color="#FFE4C4" />
      
      <directionalLight
        ref={directionalRef}
        position={[15, 12, -10]}
        intensity={1.0}
        color="#FF8C00"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0001}
      />
      
      <pointLight ref={sunRef} position={[20, 15, -20]} intensity={0.6} color="#FF6B35" distance={80} />
      
      <pointLight position={[-10, 8, 10]} intensity={0.3} color="#87CEEB" />
      <pointLight position={[10, 6, 15]} intensity={0.25} color="#4FC3F7" />
      
      <hemisphereLight
        args={["#FF7F50", "#1E90FF", 0.4]}
      />
    </>
  );
}
