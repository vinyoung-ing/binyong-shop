const STEPS = [
  {
    title: "가격표에서 담기",
    desc: "카테고리별 가격표에서 원하는 작업과 수량을 골라 담아주세요.",
  },
  {
    title: "주문하기 한 번",
    desc: "빠른주문에서 버튼을 누르면 담은 목록이 텍스트로 자동 복사됩니다.",
  },
  {
    title: "카카오톡에 붙여넣기",
    desc: "열린 카카오톡 채널에 붙여넣으면 상담원이 결제와 일정을 안내해드려요.",
  },
];

export default function Steps() {
  return (
    <section className="page-container home-section">
      <div className="section-head" data-reveal>
        <p className="eyebrow">HOW IT WORKS</p>
        <h2>가입 없이, 세 단계면 끝</h2>
      </div>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="step-card" data-reveal>
            <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
