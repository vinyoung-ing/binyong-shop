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

// 글자를 무작위 기호로 빠르게 순환시키다 원래 글자로 정착시키는 "디코딩" 효과.
// 왼쪽부터 순서대로 정착되어 CLI가 텍스트를 해독하는 듯한 느낌을 준다.
const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#01";

export function scrambleText(el, { charDelay = 28, cycles = 10, tick = 34 } = {}) {
  if (!el || el.dataset.scrambleDone) return;
  el.dataset.scrambleDone = "1";

  const finalText = el.textContent;

  if (prefersReducedMotion()) return; // 최종 텍스트를 그대로 둔다.

  const letters = finalText.split("");
  el.textContent = "";
  const spans = letters.map((ch) => {
    const span = document.createElement("span");
    span.textContent = ch === " " ? " " : ch;
    el.appendChild(span);
    return span;
  });

  spans.forEach((span, i) => {
    if (letters[i] === " ") return;
    const maxIterations = cycles + Math.floor(Math.random() * 4);

    setTimeout(() => {
      let iterations = 0;
      const timer = setInterval(() => {
        span.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        iterations++;
        if (iterations >= maxIterations) {
          clearInterval(timer);
          span.textContent = letters[i];
        }
      }, tick);
    }, i * charDelay);
  });
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

// 커서를 따라 은은한 빛(스포트라이트)이 원형으로 번지는 효과.
// --mx/--my(%) 를 실시간으로 갱신하고, 실제 시각 효과는 .spotlight-hover CSS가 그린다.
export function initSpotlight(el) {
  if (!el || !canHover()) return;
  el.classList.add("spotlight-hover");

  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  });
}

// 카드형 요소에 틸트 + 스포트라이트 + 닷매트릭스 텍스처를 한 번에 적용.
export function initCardFX(el) {
  if (!el) return;
  el.classList.add("dot-matrix-hover");
  initTilt(el);
  initSpotlight(el);
}

// containerSelector 안의 모든 요소에 initCardFX를 일괄 적용.
export function initCardFXAll(containerOrSelector, itemSelector) {
  const container =
    typeof containerOrSelector === "string"
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;
  if (!container) return;
  container.querySelectorAll(itemSelector).forEach((el) => initCardFX(el));
}
