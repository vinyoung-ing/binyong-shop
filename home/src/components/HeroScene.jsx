import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
  PerformanceMonitor,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";

const { damp } = THREE.MathUtils;

// 캔버스 밖(텍스트 위)에서 움직여도 반응하도록 창 전체의 포인터를 따로 추적한다.
const pointer = { x: 0, y: 0 };

function usePointerTracking() {
  useEffect(() => {
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}

function scrollProgress() {
  return Math.min(window.scrollY / (window.innerHeight || 1), 1.5);
}

const isLowPowerDevice = () =>
  window.matchMedia("(max-width: 800px)").matches || window.matchMedia("(pointer: coarse)").matches;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 가운데의 유리 오브젝트: 뒤쪽 스티커들을 굴절시켜 보여주는 게 포인트.
function GlassKnot({ quality, scale }) {
  const ref = useRef();
  const refractionBg = useMemo(() => new THREE.Color("#fff3f6"), []);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const scroll = scrollProgress();
    m.rotation.y += delta * (0.22 + scroll * 0.9);
    m.rotation.x = damp(m.rotation.x, pointer.y * 0.45 + scroll * 0.6, 3, delta);
    m.rotation.z = damp(m.rotation.z, -pointer.x * 0.35, 3, delta);
    m.position.x = damp(m.position.x, pointer.x * 0.25, 2.5, delta);
    m.position.y = damp(m.position.y, pointer.y * 0.15 + scroll * 0.9, 2.5, delta);
  });

  return (
    <mesh ref={ref} scale={scale}>
      <torusKnotGeometry args={[1, 0.36, quality.segments, quality.radial]} />
      <MeshTransmissionMaterial
        background={refractionBg}
        backside
        backsideThickness={0.4}
        samples={quality.samples}
        resolution={quality.resolution}
        transmission={1}
        thickness={0.9}
        roughness={0.06}
        ior={1.3}
        chromaticAberration={0.18}
        anisotropy={0.25}
        distortion={0.35}
        distortionScale={0.45}
        temporalDistortion={0.12}
        clearcoat={1}
        attenuationDistance={2.2}
        attenuationColor="#ffced8"
        color="#ffffff"
      />
    </mesh>
  );
}

const STICKERS = [
  { shape: "sphere", color: "#ffb3c6", position: [-1.9, 1.15, -2.2], scale: 0.42 },
  { shape: "box", color: "#cdb4ff", position: [1.85, 1.3, -2.6], scale: 0.5 },
  { shape: "torus", color: "#ffd6a5", position: [1.6, -1.3, -1.8], scale: 0.45 },
  { shape: "capsule", color: "#a0e7e5", position: [-1.7, -1.2, -2.4], scale: 0.38 },
  { shape: "sphere", color: "#ffced8", position: [0.3, 1.95, -3.2], scale: 0.3 },
  { shape: "box", color: "#fdf1a8", position: [-0.5, -1.95, -3], scale: 0.34 },
];

function StickerShape({ shape }) {
  switch (shape) {
    case "torus":
      return <torusGeometry args={[0.8, 0.32, 24, 64]} />;
    case "capsule":
      return <capsuleGeometry args={[0.5, 0.9, 8, 16]} />;
    default:
      return <sphereGeometry args={[1, 32, 32]} />;
  }
}

// 유리 뒤에서 떠다니는 파스텔 스티커들. 포인터 반대 방향으로 살짝 움직여 깊이감을 준다.
function StickerField() {
  const group = useRef();

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.position.x = damp(g.position.x, -pointer.x * 0.45, 2, delta);
    g.position.y = damp(g.position.y, -pointer.y * 0.3 - scrollProgress() * 0.4, 2, delta);
  });

  return (
    <group ref={group}>
      {STICKERS.map((s, i) => {
        const material = <meshStandardMaterial color={s.color} roughness={0.35} metalness={0.05} />;
        return (
          <Float key={i} speed={1.2 + i * 0.15} rotationIntensity={1.4} floatIntensity={1.4}>
            {s.shape === "box" ? (
              <RoundedBox args={[1.2, 1.2, 1.2]} radius={0.28} smoothness={4} position={s.position} scale={s.scale}>
                {material}
              </RoundedBox>
            ) : (
              <mesh position={s.position} scale={s.scale}>
                <StickerShape shape={s.shape} />
                {material}
              </mesh>
            )}
          </Float>
        );
      })}
    </group>
  );
}

// 외부 HDR 파일을 받지 않고 조명판(Lightformer)으로 반사 환경을 직접 만든다.
function StudioLights() {
  return (
    <Environment resolution={256} frames={1}>
      <group rotation={[-Math.PI / 3, 0, 1]}>
        <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
        <Lightformer form="ring" color="#ffced8" intensity={3} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={4} />
        <Lightformer form="rect" color="#cdb4ff" intensity={2} rotation-y={-Math.PI / 2} position={[5, 1, -1]} scale={[3, 6, 1]} />
      </group>
    </Environment>
  );
}

export default function HeroScene() {
  usePointerTracking();

  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [lowPower] = useState(isLowPowerDevice);
  const [reduced] = useState(prefersReducedMotion);
  const [degraded, setDegraded] = useState(false);

  // 히어로가 화면 밖으로 나가면 렌더링을 멈춰 배터리/발열을 아낀다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const low = lowPower || degraded;
  const quality = low
    ? { samples: 4, resolution: 256, segments: 128, radial: 20 }
    : { samples: 8, resolution: 512, segments: 220, radial: 32 };

  return (
    <div ref={wrapRef} className="hero3d-canvas-inner">
      <Canvas
        dpr={low ? [1, 1.25] : [1, 1.75]}
        camera={{ position: [0, 0, 7.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible && !reduced ? "always" : "demand"}
      >
        <PerformanceMonitor onDecline={() => setDegraded(true)} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <StickerField />
        <GlassKnot quality={quality} scale={lowPower ? 0.85 : 1} />
        <StudioLights />
      </Canvas>
    </div>
  );
}
