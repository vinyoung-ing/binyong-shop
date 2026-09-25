# 비뇽 (BINYONG)

재윤샵을 벤치마킹한 게임 대리 서비스 주문 사이트. 로그인/회원가입 없이 카테고리별 가격표에서
항목을 담아 빠른주문 → 카카오톡 상담으로 이어지는 구조입니다. Firebase(Firestore + Auth)와
GitHub Pages만으로 동작하며 별도 서버가 필요 없습니다.

## 1. Firebase 프로젝트 설정

1. https://console.firebase.google.com 에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴 **Firestore Database** → "데이터베이스 만들기" → 위치는 `asia-northeast3(서울)` 권장 → 프로덕션 모드로 시작.
3. 왼쪽 메뉴 **Authentication** → "시작하기" → 로그인 방법에서 **이메일/비밀번호** 활성화.
   → Authentication > Users 탭에서 관리자로 쓸 이메일/비밀번호 계정을 하나 직접 추가합니다.
4. 프로젝트 설정(톱니바퀴) → 일반 → "내 앱"에서 **웹 앱 추가**(</> 아이콘) → 앱 닉네임 아무거나 입력 →
   생성된 `firebaseConfig` 객체 값을 복사합니다.
5. 이 프로젝트의 [`js/firebase-config.js`](js/firebase-config.js) 파일을 열어 복사한 값으로 채워 넣습니다.
6. Firestore Database → 규칙(Rules) 탭에 이 프로젝트의 [`firestore.rules`](firestore.rules) 내용을
   그대로 붙여넣고 **게시(Publish)** 합니다. (이걸 안 하면 누구나 카테고리를 수정할 수 있게 됩니다.)
7. 배너 이미지를 쓰려면 왼쪽 메뉴 **Storage**에 들어가서 "시작하기"로 기본 버킷을 한 번 만들고,
   규칙(Rules) 탭에 이 프로젝트의 [`storage.rules`](storage.rules) 내용을 붙여넣고 게시합니다.

## 2. 사이트 설정값 채우기

[`js/site-config.js`](js/site-config.js) 를 열어:
- `kakaoChannelUrl`: 카카오톡 채널 관리자센터 → 채널 홈 → "채팅 링크"에서 발급받은 주소로 교체.
- 필요하면 `discordUrl` 도 채워주세요.

## 3. 카테고리/가격표/배너 입력

배포 후 `admin/` 폴더로 들어가 방금 만든 관리자 계정으로 로그인하면:
- **카테고리 관리**에서 "엘프" 카테고리를 추가하고, 그 안에 "올클/챕터1/챕터2/챕터3/기타" 같은 그룹을 만들고,
  각 그룹 안에 항목(이름/단가/단위/비고)을 입력하면 바로 서비스 페이지에 반영됩니다.
- 리부트·미네랄도 나중에 이 화면에서 카테고리를 추가하기만 하면 됩니다. 코드 수정이 필요 없습니다.
- **배너 관리**에서 이미지를 한 장 또는 여러 장 업로드하면 홈 화면 맨 위에 자동으로 넘어가는
  배너로 표시됩니다. 자동 전환 간격(초)도 같은 화면에서 설정할 수 있습니다.

## 4. GitHub Pages로 배포하기

이 폴더에서 (Git이 없다면 먼저 설치: https://git-scm.com):

```bash
git init
git add .
git commit -m "init: 비뇽 사이트 초기 구축"
git branch -M main
git remote add origin https://github.com/<사용자명>/binyong-shop.git
git push -u origin main
```

GitHub 저장소 페이지 → **Settings → Pages** → Source를 "Deploy from a branch" →
Branch를 `main` / `/(root)` 로 선택 → Save.

몇 분 뒤 `https://<사용자명>.github.io/binyong-shop/` 에서 사이트가 열립니다.

## 폴더 구조

```
index.html          홈
services.html        카테고리별 가격표 + 담기
order.html           빠른주문 (담은 항목 확인 → 접수 → 카카오톡 연결)
notice.html          공지사항
guide.html           이용안내
admin/               관리자 (로그인 필요)
  index.html          로그인
  dashboard.html      대시보드
  banners.html        배너 관리 (업로드/순서/자동전환 간격)
  categories.html     카테고리/그룹/항목 CRUD
  orders.html         주문 목록/상태 관리
  notices.html        공지사항 CRUD
js/                  공용 로직 (Firebase 초기화, 카탈로그 CRUD, 장바구니, 배너 등)
css/style.css         전체 스타일
firestore.rules       Firestore 보안 규칙 (Firebase 콘솔에 붙여넣을 것)
storage.rules         Storage 보안 규칙 (배너 이미지 업로드용, Firebase 콘솔에 붙여넣을 것)
```

## 참고: 가격 단위

가격표 숫자(0.05, 1.2, 1.5 등)의 실제 통화 단위(만원 등)가 아직 확정되지 않아, 관리자 페이지에서
단가는 숫자 그대로, 단위는 "레벨/개/세트" 같은 수량 단위만 입력하도록 되어 있습니다. 실제 통화 단위가
정해지면 `js/site-config.js` 나 가격 표시 부분에 단위 표기를 추가하는 걸 권장합니다.
