import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const CityCanvas3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      1000
    );
    camera.position.set(30, 45, 60);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // City Grid Floor
    const gridHelper = new THREE.GridHelper(80, 40, 0x00f2fe, 0x161e2e);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Procedural City Building Wireframe Blocks
    const group = new THREE.Group();
    const buildingCount = 45;
    const geometries = [];

    // Colors matching our risk scale
    const riskColors = [0x10b981, 0x10b981, 0xf59e0b, 0xef4444, 0x991b1b];

    for (let i = 0; i < buildingCount; i++) {
      const w = 2 + Math.random() * 2.5;
      const d = 2 + Math.random() * 2.5;
      const h = 3 + Math.random() * 18;

      const x = (Math.random() - 0.5) * 55;
      const z = (Math.random() - 0.5) * 55;

      const geom = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geom);

      const color = riskColors[Math.floor(Math.random() * riskColors.length)];
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35 + (h / 25) * 0.45,
      });

      const line = new THREE.LineSegments(edges, lineMat);
      line.position.set(x, h / 2, z);
      group.add(line);
    }
    scene.add(group);

    // Floating particles (data packets)
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 70;
      particlePositions[i + 1] = Math.random() * 25;
      particlePositions[i + 2] = (Math.random() - 0.5) * 70;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.7,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse movement interaction
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / container.clientWidth - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / container.clientHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Slow majestic rotation
      group.rotation.y = elapsed * 0.04 + mouseX * 0.2;
      gridHelper.rotation.y = elapsed * 0.04 + mouseX * 0.2;

      camera.position.y = 45 - mouseY * 8;

      // Particle floating drift
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += 0.03;
        if (positions[i] > 25) {
          positions[i] = 0;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen overflow-hidden"
      aria-hidden="true"
    />
  );
};
