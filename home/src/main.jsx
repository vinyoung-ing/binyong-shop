import { createRoot } from "react-dom/client";
import { renderHeader, renderFooter } from "../../js/common.js";
import App from "./App.jsx";

// 헤더/푸터는 다른 페이지와 똑같은 공용 모듈로 그려서 항상 동일하게 유지한다.
renderHeader("home");
renderFooter();

createRoot(document.getElementById("root")).render(<App />);
