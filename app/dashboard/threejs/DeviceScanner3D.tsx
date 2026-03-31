"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface DeviceScanner3DProps {
  status: "idle" | "scanning" | "pairing" | "complete";
}

export const DeviceScanner3D = ({ status }: DeviceScanner3DProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);

  // Sync ref for the animation loop to avoid stale closures
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = 300;
    const height = 300;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Transparent background for better UI integration
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x3b82f6, 2, 10);
    mainLight.position.set(2, 3, 2);
    scene.add(mainLight);

    // --- CORE OBJECT: THE DEVICE ---
    const coreGeo = new THREE.IcosahedronGeometry(0.8, 1); // Low-poly tech look
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x065f46,
      emissiveIntensity: 0.5,
      wireframe: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // --- SCAN RINGS ---
    const createRing = (radius: number, color: number) => {
      const geo = new THREE.TorusGeometry(radius, 0.02, 16, 100);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
      });
      return new THREE.Mesh(geo, mat);
    };

    const ring1 = createRing(1.2, 0x3b82f6);
    const ring2 = createRing(1.4, 0x60a5fa);
    ring2.rotation.x = Math.PI / 2;
    scene.add(ring1, ring2);

    // --- PARTICLES (DATA BITS) ---
    const particlesCount = 40;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      pPos[i] = (Math.random() - 0.5) * 4;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x3b82f6,
      transparent: true,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // --- CONTROLS ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    // --- ANIMATION LOGIC ---
    let frame = 0;
    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      frame += 0.01;

      // React to Status
      const currentStatus = statusRef.current;

      if (currentStatus === "scanning") {
        coreMat.color.setHex(0x3b82f6);
        coreMat.emissiveIntensity = Math.sin(frame * 10) * 0.5 + 0.5;
        ring1.scale.setScalar(1 + Math.sin(frame * 5) * 0.1);
        ring2.scale.setScalar(1 + Math.cos(frame * 5) * 0.1);
      } else if (currentStatus === "pairing") {
        coreMat.color.setHex(0xef4444);
        controls.autoRotateSpeed = 15; // Rapid rotation
        ring1.rotation.y += 0.1;
      } else if (currentStatus === "complete") {
        coreMat.color.setHex(0x10b981);
        coreMat.emissiveIntensity = 0.2;
        controls.autoRotateSpeed = 0.5;
      }

      // Base rotations
      core.rotation.x += 0.005;
      core.rotation.z += 0.005;
      points.rotation.y += 0.001;

      controls.update();
      renderer.render(scene, camera);
      return animationId;
    };

    const animationId = animate();

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div className="relative group flex justify-center items-center">
      {/* CSS Glow Overlay */}
      <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div ref={mountRef} className="z-10 cursor-grab active:cursor-grabbing" />

      {/* Label Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Device:{" "}
          <span
            className={
              status === "complete" ? "text-emerald-500" : "text-blue-500"
            }
          >
            {status}
          </span>
        </p>
      </div>
    </div>
  );
};
