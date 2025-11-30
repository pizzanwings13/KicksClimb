import { useRef } from "react";
import * as THREE from "three";

export function Lights() {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  
  return (
    <>
      <ambientLight intensity={0.4} color="#b3c6ff" />
      
      <directionalLight
        ref={directionalRef}
        position={[10, 15, 10]}
        intensity={1.2}
        color="#ffffff"
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
      
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ff6b6b" />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#4ecdc4" />
      
      <hemisphereLight
        args={["#87ceeb", "#2d3748", 0.3]}
      />
    </>
  );
}
