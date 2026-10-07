'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AudioAnalysisData } from '@/hooks/useAudioAnalyzer';

interface ThreeCanvasProps {
  getAudioData?: () => AudioAnalysisData;
  isPlaying?: boolean;
}

export function ThreeCanvas({ getAudioData, isPlaying = false }: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const getAudioDataRef = useRef(getAudioData);

  useEffect(() => {
    getAudioDataRef.current = getAudioData;
  }, [getAudioData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.015);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Add Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x99ccff, 3, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    // 3. Create Particle Field
    const particleCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const colorPalette = [
      new THREE.Color(0x99ccff),
      new THREE.Color(0x336699),
      new THREE.Color(0xffffff),
      new THREE.Color(0x5588cc),
    ];

    for (let i = 0; i < particleCount; i++) {
      // Sphere & Tunnel distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 5 + Math.random() * 45;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      scales[i] = Math.random() * 2 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create Canvas Texture for Soft Round Particles
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(153,204,255,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);

    // 4. Create Interactive Wireframe Core
    const coreGeometry = new THREE.IcosahedronGeometry(8, 2);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x99ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      emissive: 0x112244,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // Outer Ring
    const ringGeometry = new THREE.TorusGeometry(14, 0.2, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x336699,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ringMesh);

    // 5. Mouse Parallax Movement
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 6. Animation Render Loop
    let animFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.01;

      // Fetch Web Audio API data if connected
      let bass = 0;
      let mid = 0;
      let treble = 0;
      let energy = 0;
      let isBeat = false;

      if (getAudioDataRef.current) {
        const audioData = getAudioDataRef.current();
        bass = audioData.bass;
        mid = audioData.midrange;
        treble = audioData.treble;
        energy = audioData.overallEnergy;
        isBeat = audioData.isBeat;
      }

      // Modulation scale factors (ambient fallback if silent)
      const bassFactor = isPlaying ? bass : (Math.sin(time * 2) * 0.1 + 0.15);
      const midFactor = isPlaying ? mid : (Math.cos(time * 1.5) * 0.1 + 0.15);
      const energyFactor = isPlaying ? energy : 0.1;

      // Core Mesh Modulation
      const targetScale = 1 + bassFactor * 1.8;
      coreMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      coreMesh.rotation.x += 0.003 + energyFactor * 0.02;
      coreMesh.rotation.y += 0.005 + energyFactor * 0.03;

      ringMesh.rotation.x -= 0.004 + midFactor * 0.01;
      ringMesh.rotation.z += 0.006 + bassFactor * 0.02;

      // Beat Pulse effect
      if (isBeat) {
        coreMaterial.opacity = 0.8;
        pointLight.intensity = 8;
      } else {
        coreMaterial.opacity = THREE.MathUtils.lerp(coreMaterial.opacity, 0.35, 0.05);
        pointLight.intensity = THREE.MathUtils.lerp(pointLight.intensity, 3 + bassFactor * 4, 0.05);
      }

      // Particle Motion
      const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = positionAttr.array as Float32Array;

      const speed = 0.2 + energyFactor * 1.5;

      for (let i = 0; i < particleCount; i++) {
        // Move particles along Z axis toward camera
        posArray[i * 3 + 2] += speed;

        // Reset particles that travel past camera
        if (posArray[i * 3 + 2] > 50) {
          posArray[i * 3 + 2] = -50;
        }
      }
      positionAttr.needsUpdate = true;

      // Particle System Rotation
      particleSystem.rotation.z += 0.001 + energyFactor * 0.005;

      // Camera Smooth Parallax
      camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      particleMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    />
  );
}
