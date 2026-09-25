import { useEffect } from "react";
import { renderBannerCarousel } from "../../../js/banner-carousel.js";

// 관리자에서 등록한 배너가 있을 때만 보인다(없으면 공용 모듈이 hidden 처리).
export default function Banner() {
  useEffect(() => {
    renderBannerCarousel("banner-carousel");
  }, []);

  return (
    <section className="page-container home-banner">
      <div id="banner-carousel" className="banner-carousel" hidden />
    </section>
  );
}
