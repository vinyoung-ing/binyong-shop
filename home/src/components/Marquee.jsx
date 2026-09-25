const WORDS = ["엘프", "리부트", "미네랄", "빠른 주문", "카카오톡 상담", "안전한 작업", "BINYONG"];

// 끊김 없이 흐르도록 같은 목록을 두 번 이어 붙이고 CSS로 -50%만큼 흘린다.
export default function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((w, i) => (
          <span key={i} className="marquee-item">
            {w}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
