import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { scrambleText, initMagnetic } from "../../../js/motion.js";
import { siteConfig } from "../../../js/site-config.js";
import { heroTitleError, normalizeHeroTitle } from "../../../js/common.js";
import { getSiteSettings } from "../../../js/banners.js";

// 관리자에서 저장한 문구를 쓰되, 비어 있거나 규칙에 안 맞으면 기본 문구로 대체한다.
function pickTitle(settings) {
  const saved = normalizeHeroTitle(settings?.heroTitle);
  return saved && !heroTitleError(saved) ? saved : siteConfig.tagline;
}

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
  const [title, setTitle] = useState(null);

  useEffect(() => {
    initMagnetic(ctaRef.current);
    // 설정을 늦게 받아오더라도 제목이 너무 오래 비어 있지 않게 기본 문구로 먼저 띄운다.
    const fallback = setTimeout(() => setTitle((t) => t ?? siteConfig.tagline), 1500);
    getSiteSettings()
      .then((s) => setTitle(pickTitle(s)))
      .catch(() => setTitle(siteConfig.tagline))
      .finally(() => clearTimeout(fallback));
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (title) scrambleText(titleRef.current);
  }, [title]);

  return (
    <section className="hero3d">
      <div className="hero3d-inner">
        <div className="hero3d-copy">
          <p className="eyebrow">GAME SERVICE CENTER · {siteConfig.siteNameEn}</p>
          {/* 문구가 바뀌면 새 요소로 교체해서 스크램블 효과를 다시 재생한다. 불러오는 동안은 자리만 차지. */}
          <h1 key={title ?? "loading"} className={`hero3d-title${title ? "" : " is-loading"}`} ref={titleRef}>
            {title ?? siteConfig.tagline}
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
