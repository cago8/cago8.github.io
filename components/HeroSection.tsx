'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FaCodepen, FaGithub, FaInstagram, FaLinkedin, FaReddit, FaXTwitter } from 'react-icons/fa6';
import { SiGmail } from 'react-icons/si';
import { site } from '../config/site';

const MOUSE_INTERPOLATION = { x: 0.1, y: 0.2 };
const TOUCH_IDLE_INTERPOLATION = { x: 0.03, y: 0.03 };
/** Added to `targetX` so the hero model sits slightly right of the prior layout. */
const MODEL_X_NUDGE = 0.28;

const socialLinks = [
  { label: 'GitHub', href: site.social.github, Icon: FaGithub },
  { label: 'LinkedIn', href: site.social.linkedin, Icon: FaLinkedin },
  { label: 'Gmail', href: `mailto:${site.email}`, Icon: SiGmail },
  { label: 'Instagram', href: site.social.instagram, Icon: FaInstagram },
  { label: 'X', href: site.social.x, Icon: FaXTwitter },
  { label: 'Reddit', href: site.social.reddit, Icon: FaReddit },
];

function PenguinModel() {
  const anchorRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const interpolationRef = useRef({ ...MOUSE_INTERPOLATION });
  const { size } = useThree();

  const gltf = useGLTF('/assets/models/Penguins.glb');

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      mouseRef.current.x = mouseX;
      mouseRef.current.y = mouseY;
      interpolationRef.current = { ...MOUSE_INTERPOLATION };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const mouseX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;

      mouseRef.current.x = mouseX;
      mouseRef.current.y = mouseY;
      interpolationRef.current = { ...MOUSE_INTERPOLATION };
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        mouseRef.current = { x: 0, y: 0 };
        interpolationRef.current = { ...TOUCH_IDLE_INTERPOLATION };

        setTimeout(() => {
          interpolationRef.current = { ...MOUSE_INTERPOLATION };
        }, 1000);
      }, 2000);
    };

    document.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useFrame(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const aspect = size.width / Math.max(size.height, 1);
    const isMobile = size.width < 768;
    const isShortViewport = size.height < 760 && !isMobile;

    let targetScale = 5.15;
    let targetX = 2.22;
    let targetY = -0.38;

    if (size.width < 480) {
      targetScale = 3.45;
      targetX = 0.18;
      targetY = -0.36;
    } else if (size.width < 640) {
      targetScale = 3.72;
      targetX = 0.24;
      targetY = -0.34;
    } else if (size.width < 768) {
      targetScale = 3.95;
      targetX = 0.3;
      targetY = -0.3;
    } else if (size.width < 900) {
      targetScale = 4.05;
      targetX = 1.05;
      targetY = -0.54;
    } else if (size.width < 1100) {
      targetScale = 4.45;
      targetX = 1.28;
      targetY = -0.5;
    } else if (size.width < 1366) {
      targetScale = 4.85;
      targetX = 1.95;
      targetY = -0.41;
    } else if (size.width < 1700) {
      targetScale = 5.0;
      targetX = 2.14;
      targetY = -0.38;
    }

    if (!isMobile) {
      if (aspect < 1.55) {
        targetScale -= 0.3;
        targetX += 0.2;
      } else if (aspect > 2.15) {
        targetScale += 0.1;
        targetX -= 0.05;
      }
    }

    if (isShortViewport) {
      targetScale *= 0.93;
      targetY -= 0.04;
    }

    if (isMobile) {
      targetScale *= 1.08;
      targetY -= 0.12;
    } else {
      targetX += 0.16;
      targetScale *= 1.03;
    }

    anchor.scale.setScalar(targetScale);
    anchor.position.set(targetX + MODEL_X_NUDGE, targetY, 0);

    const { x: mouseX, y: mouseY } = mouseRef.current;
    const { x: interpolationX, y: interpolationY } = interpolationRef.current;

    if (window.scrollY < 200) {
      const maxDownTilt = 0.48;
      const maxSideTurn = Math.PI / 7;
      const targetTiltX = -mouseY * maxDownTilt;
      const targetTurnY = mouseX * maxSideTurn;

      anchor.rotation.x = THREE.MathUtils.lerp(anchor.rotation.x, targetTiltX, interpolationX);
      anchor.rotation.y = THREE.MathUtils.lerp(anchor.rotation.y, targetTurnY, interpolationY);
    } else if (window.innerWidth > 1024) {
      anchor.rotation.x = THREE.MathUtils.lerp(anchor.rotation.x, 0, 0.03);
      anchor.rotation.y = THREE.MathUtils.lerp(anchor.rotation.y, 0, 0.03);
    }
  });

  return (
    <Float speed={0.9} rotationIntensity={0.15} floatIntensity={0.25}>
      <group ref={anchorRef}>
        <group rotation={[0, Math.PI / 2, 0]}>
          <primitive object={gltf.scene} />
        </group>
      </group>
    </Float>
  );
}

useGLTF.preload('/assets/models/Penguins.glb');

export default function HeroSection() {
  return (
    <section id="home-top" className="relative min-h-screen overflow-hidden bg-background">
      <div className="hero-canvas-enter pointer-events-none absolute inset-x-0 bottom-0 top-[34vh] z-0 md:inset-0">
        <Canvas
          camera={{ fov: 40, position: [0, 0.35, 11.6] }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#0F172A']} />
          <ambientLight intensity={0.95} />
          <directionalLight intensity={1.18} position={[2.4, 3.2, 3.2]} />
          <Suspense fallback={null}>
            <PenguinModel />
            <Environment files="/assets/hdri/potsdamer_platz_1k.hdr" />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#0F172A] via-[#0F172A]/92 to-transparent md:hidden" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-start px-6 pb-16 pt-24 sm:px-10 md:items-center md:py-16 lg:px-14">
        <div className="max-w-2xl space-y-5 pb-10 sm:pb-12 md:max-w-[56%] md:pb-0 hero-enter">
          <p className="hero-enter-item text-xs uppercase tracking-[0.2em] text-slate-300">
            Software Engineer · AI &amp; ML
          </p>
          <h1 className="hero-enter-item font-heading text-5xl font-extrabold leading-[0.98] text-slate-50 sm:text-6xl md:text-7xl lg:text-8xl">
            {site.givenName} <span className="text-brand-primary">{site.familyName}</span>
          </h1>
          <p className="hero-enter-item max-w-xl font-body text-lg leading-relaxed text-slate-200 sm:text-xl">
           Building with passion.
          </p>

          <div id="socials" className="hero-enter-item pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-primary/35 bg-brand-primary/10 text-slate-100 transition hover:bg-brand-primary/20"
                  data-cursor="disable"
                  aria-label={label}
                  title={label}
                >
                  <Icon className="h-4 w-4 text-brand-primary transition group-hover:text-slate-100" />
                </a>
              ))}
              <a
                href="/assets/cv.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex h-10 items-center rounded-full border border-brand-primary/45 bg-brand-primary/10 px-4 font-body text-xs font-semibold tracking-[0.08em] text-slate-100 transition hover:bg-brand-primary/20"
                data-cursor="disable"
                aria-label="Resume"
                title="Resume"
              >
                RESUME
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
