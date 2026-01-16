import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Lights() {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const sunRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.intensity = 0.8 + Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.6} color="#87CEEB" />
      
      <directionalLight
        ref={directionalRef}
        position={[20, 25, -15]}
        intensity={1.2}
        color="#FFD700"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
      />
      
      <pointLight ref={sunRef} position={[30, 20, -30]} intensity={0.8} color="#FF8C00" distance={100} />
      
      <pointLight position={[-15, 10, 10]} intensity={0.4} color="#4FC3F7" />
      <pointLight position={[15, 8, 15]} intensity={0.3} color="#00BCD4" />
      
      <hemisphereLight
        args={["#87CEEB", "#0077BE", 0.5]}
      />
    </>
  );
}
