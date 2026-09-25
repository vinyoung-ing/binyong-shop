import { useEffect, useRef, useState } from "react";
import { listCategories } from "../../../js/catalog.js";
import { initScrollReveal } from "../../../js/common.js";
import { initCardFX } from "../../../js/motion.js";

export default function Categories() {
  const [state, setState] = useState({ status: "loading", categories: [] });
  const gridRef = useRef(null);

  useEffect(() => {
    listCategories()
      .then((categories) => setState({ status: "ready", categories }))
      .catch((e) => {
        console.error(e);
        setState({ status: "error", categories: [] });
      });
  }, []);

  useEffect(() => {
    if (state.status !== "ready" || !gridRef.current) return;
    initScrollReveal(gridRef.current);
    gridRef.current.querySelectorAll(".category-card:not(.disabled)").forEach(initCardFX);
  }, [state]);

  return (
    <section className="page-container home-section">
      <div className="section-head" data-reveal>
        <p className="eyebrow">SERVICES</p>
        <h2>지금 맡길 수 있는 서비스</h2>
        <p className="section-desc">카테고리를 골라 가격표를 확인하고, 원하는 항목만 담아 한 번에 주문하세요.</p>
      </div>

      {state.status === "loading" && <p className="muted">불러오는 중...</p>}
      {state.status === "error" && <p className="muted">카테고리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>}
      {state.status === "ready" && state.categories.length === 0 && (
        <p className="muted">아직 등록된 카테고리가 없습니다.</p>
      )}

      {state.categories.length > 0 && (
        <div className="category-grid" ref={gridRef}>
          {state.categories.map((c, i) => {
            const active = c.status === "active";
            return (
              <article key={c.id} className={`category-card${active ? "" : " disabled"}`} data-reveal>
                <div className="category-card-top">
                  <span className="card-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`badge ${active ? "active" : "coming-soon"}`}>{active ? "운영중" : "오픈예정"}</span>
                </div>
                <h3>{c.name}</h3>
                <p>{c.description || (active ? "가격표에서 원하는 항목을 담아보세요." : "곧 오픈할 예정이에요.")}</p>
                {active ? (
                  <a href={`services.html?cat=${c.id}`} className="card-link">
                    가격표 보기 <span aria-hidden="true">→</span>
                  </a>
                ) : (
                  <span className="card-link is-disabled">준비중</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
