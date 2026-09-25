import { listBanners, getSiteSettings } from "./banners.js";

export async function renderBannerCarousel(containerId = "banner-carousel") {
  const el = document.getElementById(containerId);
  if (!el) return;

  let banners = [];
  let settings = {};
  try {
    [banners, settings] = await Promise.all([listBanners(), getSiteSettings()]);
    banners = banners.filter((b) => b.imageUrl);
  } catch (e) {
    console.error(e);
  }

  if (!banners || banners.length === 0) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  const intervalSeconds = Number(settings.bannerIntervalSeconds) > 0 ? Number(settings.bannerIntervalSeconds) : 4;

  el.innerHTML = `
    ${banners
      .map(
        (b, i) => `
      <div class="banner-slide ${i === 0 ? "active" : ""}" data-slide-index="${i}">
        ${
          b.linkUrl
            ? `<a href="${b.linkUrl}" target="_blank" rel="noopener"><img src="${b.imageUrl}" alt="배너" /></a>`
            : `<img src="${b.imageUrl}" alt="배너" />`
        }
      </div>
    `
      )
      .join("")}
    ${
      banners.length > 1
        ? `<div class="banner-dots">
            ${banners.map((_, i) => `<button data-dot-index="${i}" class="${i === 0 ? "active" : ""}"></button>`).join("")}
          </div>`
        : ""
    }
  `;

  // 배너 영역을 첫 이미지의 실제 비율에 맞춰 모바일에서도 양옆이 잘리지 않게 한다.
  // 이상한 비율의 이미지 하나로 영역이 너무 길어지거나 납작해지지 않도록 범위를 제한한다.
  const firstImg = el.querySelector("img");
  const fitToImage = () => {
    if (!firstImg.naturalWidth || !firstImg.naturalHeight) return;
    const ratio = Math.min(4, Math.max(1.2, firstImg.naturalWidth / firstImg.naturalHeight));
    el.style.aspectRatio = String(ratio);
  };
  if (firstImg.complete) fitToImage();
  else firstImg.addEventListener("load", fitToImage, { once: true });

  if (banners.length <= 1) return;

  const slides = el.querySelectorAll(".banner-slide");
  const dots = el.querySelectorAll(".banner-dots button");
  let current = 0;
  let timer = null;

  function goTo(index) {
    current = (index + banners.length) % banners.length;
    slides.forEach((s, i) => s.classList.toggle("active", i === current));
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function startAutoPlay() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), intervalSeconds * 1000);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.dotIndex));
      startAutoPlay();
    });
  });

  startAutoPlay();
}
