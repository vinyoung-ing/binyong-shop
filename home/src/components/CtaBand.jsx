import { useEffect, useRef } from "react";
import { initMagnetic } from "../../../js/motion.js";

export default function CtaBand() {
  const btnRef = useRef(null);

  useEffect(() => {
    initMagnetic(btnRef.current);
  }, []);

  return (
    <section className="page-container home-section">
      <div className="cta-band" data-reveal>
        <div>
          <p className="eyebrow">READY?</p>
          <h2>오늘 할 숙제, 비뇽에게 맡겨보세요.</h2>
        </div>
        <a href="services.html" className="btn-primary" ref={btnRef}>
          가격표 보러가기
        </a>
      </div>
    </section>
  );
}
