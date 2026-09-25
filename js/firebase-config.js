// Firebase 콘솔(https://console.firebase.google.com) > 프로젝트 설정 > 일반 > "내 앱" 에서
// 웹 앱을 추가하면 아래와 같은 형식의 설정값을 받을 수 있습니다.
// 그 값을 그대로 복사해서 아래 객체를 채워주세요.
//
// Firestore Database 와 Authentication(이메일/비밀번호 로그인)도
// Firebase 콘솔에서 미리 활성화해두어야 합니다.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
