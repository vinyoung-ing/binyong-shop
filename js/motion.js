// 가벼운 순수 JS/CSS 모션 유틸 모음 (외부 라이브러리 없이 구현).
// - 마우스가 있는 데스크톱에서만 인터랙션 모션을 걸고, 터치 기기/모션 최소화 설정에서는
//   자동으로 비활성화해 성능·접근성 문제를 피한다.

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canHover() {
  return (
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !prefersReducedMotion()
  );
}

// 텍스트를 단어 단위 span으로 감싸고, 다음 프레임에 is-in 클래스를 붙여
// CSS 트랜지션(아래에서 위로 올라오는 효과)이 순차적으로 재생되게 한다.
export function splitTextReveal(el) {
  if (!el || el.dataset.splitDone) return;
  el.dataset.splitDone = "1";

  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  el.classList.add("split-text");

  words.forEach((word, i) => {
    const outer = document.createElement("span");
    outer.className = "split-word";
    outer.style.setProperty("--split-i", i);

    const inner = document.createElement("span");
    inner.textContent = word;
    outer.appendChild(inner);

    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
  });

  if (prefersReducedMotion()) {
    el.classList.add("is-in");
    return;
  }

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
}

// 버튼 안에서 마우스를 움직이면 그 방향으로 살짝 끌려오는 마그네틱 효과.
export function initMagnetic(el, strength = 0.35) {
  if (!el || !canHover()) return;
  el.classList.add("magnetic");

  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  });

  el.addEventListener("mouseleave", () => {
    el.style.transform = "translate(0, 0)";
  });
}

// 카드 위에서 마우스 위치에 따라 미세하게 기울어지는 3D 틸트 효과.
export function initTilt(el, maxDeg = 7) {
  if (!el || !canHover()) return;
  el.classList.add("tilt-card");

  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0~1
    const py = (e.clientY - rect.top) / rect.height; // 0~1
    const rotateY = (px - 0.5) * maxDeg * 2;
    const rotateX = (0.5 - py) * maxDeg * 2;
    el.style.transition = "none";
    el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`;
  });

  el.addEventListener("mouseleave", () => {
    el.style.transition = "";
    el.style.transform = "";
  });
}

// containerSelector 안의 모든 요소에 initTilt를 일괄 적용.
export function initTiltAll(containerOrSelector, itemSelector) {
  const container =
    typeof containerOrSelector === "string"
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;
  if (!container) return;
  container.querySelectorAll(itemSelector).forEach((el) => initTilt(el));
}
