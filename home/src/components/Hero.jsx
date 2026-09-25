import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { scrambleText, initMagnetic } from "../../../js/motion.js";
import { siteConfig } from "../../../js/site-config.js";

// three.js 번들은 무거우므로 텍스트가 먼저 뜨고 3D는 뒤이어 로드되게 분리한다.
const HeroScene = lazy(() => import("./HeroScene.jsx"));

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Hero() {
  const titleRef = useRef(null);
  const ctaRef = useRef(null);
  const [webgl] = useState(supportsWebGL);

  useEffect(() => {
    scrambleText(titleRef.current);
    initMagnetic(ctaRef.current);
  }, []);

  return (
    <section className="hero3d">
      <div className="hero3d-inner">
        <div className="hero3d-copy">
          <p className="eyebrow">GAME SERVICE CENTER · {siteConfig.siteNameEn}</p>
          <h1 className="hero3d-title" ref={titleRef}>
            게임은 즐기고, 대리는 비뇽에게.
          </h1>
          <p className="hero3d-desc">
            카테고리별 가격표에서 원하는 작업을 담고, 버튼 한 번으로 카카오톡 상담까지.
            복잡한 가입 없이 가장 빠르게 맡겨보세요.
          </p>
          <div className="hero3d-actions">
            <a href="services.html" className="btn-primary" ref={ctaRef}>
              가격표 보러가기
            </a>
            <a href={siteConfig.kakaoChannelUrl} target="_blank" rel="noopener" className="btn-secondary">
              카카오톡 상담
            </a>
          </div>
        </div>

        <div className="hero3d-canvas" aria-hidden="true">
          {webgl && (
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          )}
        </div>
      </div>

      <div className="scroll-hint" aria-hidden="true">
        <span>SCROLL</span>
        <i />
      </div>
    </section>
  );
}
