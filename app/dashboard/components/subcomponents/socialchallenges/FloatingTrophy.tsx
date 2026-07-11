"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function TrophyMesh() {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.y = t * 0.35;
    mesh.current.rotation.x = Math.sin(t * 0.2) * 0.1;
  });

  return (
    <Float speed={2.4} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={mesh}>
        <octahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#047857"
          emissiveIntensity={0.3}
          roughness={0.15}
          metalness={0.85}
          flatShading={true}
        />
      </mesh>
    </Float>
  );
}

export function FloatingTrophy() {
  return (
    <div className="w-full h-full select-none pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <directionalLight
          position={[-5, 5, 2]}
          intensity={0.8}
          color="#a7f3d0"
        />
        <spotLight position={[0, -10, 2]} intensity={0.5} color="#059669" />
        <TrophyMesh />
      </Canvas>
    </div>
  );
}
