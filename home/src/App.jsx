import { useEffect } from "react";
import { initScrollReveal } from "../../js/common.js";
import Hero from "./components/Hero.jsx";
import Marquee from "./components/Marquee.jsx";
import Banner from "./components/Banner.jsx";
import Categories from "./components/Categories.jsx";
import Steps from "./components/Steps.jsx";
import CtaBand from "./components/CtaBand.jsx";

export default function App() {
  // 처음부터 화면에 있는 [data-reveal] 섹션들. (비동기로 늦게 그려지는 카드는 각 컴포넌트가 따로 처리)
  useEffect(() => {
    initScrollReveal();
  }, []);

  return (
    <main>
      <Hero />
      <Marquee />
      <Banner />
      <Categories />
      <Steps />
      <CtaBand />
    </main>
  );
}
