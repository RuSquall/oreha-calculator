# 로스트아크 융화 재료 계산기 (Oreha Calculator)

## 📋 프로젝트 개요

이 프로젝트는 로스트아크 게임 내 융화 재료(아비도스 융화 재료, 상급 아비도스 융화 재료) 제작과 관련된 경제적 최적화를 돕기 위해 개발되었습니다. 현재 시세를 기반으로 재료 구매 및 융화 재료 제작 시 이득을 계산하며, 보유 재료를 활용한 최대 생산량 및 종합적인 최적 행동 가이드라인을 제공합니다.

### 💡 주요 기능

1.  **비용 최적화 계산기**: 현재 시장 시세를 기반으로 융화 재료 제작 시 예상 이득을 계산합니다.
2.  **종합 분석 계산기**: 보유한 재료 수량을 입력하면, '전부 판매', '최대 제작 후 판매', '최대 제작 후 사용' 세 가지 시나리오를 분석하여 가장 경제적인 행동을 추천합니다.
3.  **최대 생산량 계산기**: 보유한 재료로 만들 수 있는 융화 재료의 최대 수량을 계산합니다.
4.  **시세 자동 업데이트**: 로스트아크 API를 통해 실시간 시장 데이터를 반영합니다. (Netlify Scheduled Functions, GitHub Actions 활용)
5.  **캐시 폴백 시스템**: API 호출 실패 시 직전 캐시된 시세를 표시하여 서비스 안정성을 높입니다.
6.  **반응형 UI**: 모바일 및 데스크톱 환경에서 모두 쾌적하게 사용할 수 있습니다.

## 🚀 빠른 시작 가이드

프로젝트를 로컬 환경에서 실행하고 개발하기 위한 단계입니다.

### 📥 1. 종속성 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 필요한 모든 종속성을 설치합니다.

```bash
npm install
```

### 🛠️ 2. 환경 변수 설정

`LOSTARK_API_KEY`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`은 필수 환경 변수입니다.

루트 디렉토리에 `.env` 파일을 생성하고 다음 예시와 같이 값을 설정해 주세요. `.env.example` 파일을 참고할 수 있습니다.

```
# .env 파일 예시
LOSTARK_API_KEY=YOUR_LOSTARK_API_KEY
UPSTASH_REDIS_URL=YOUR_UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN=YOUR_UPSTASH_REDIS_TOKEN
```

*   **LOSTARK_API_KEY**: 로스트아크 개발자 센터에서 발급받을 수 있습니다.
*   **UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN**: Upstash Redis에서 무료로 인스턴스를 생성하고 발급받을 수 있습니다. 시세 데이터 저장에 사용됩니다.

### 🏃 3. 애플리케이션 실행

개발 모드로 애플리케이션을 시작합니다.

```bash
npm start
```

브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 확인할 수 있습니다.

## ☁️ Netlify 배포 및 환경 변수 설정

이 프로젝트는 Netlify를 통해 배포될 수 있도록 최적화되어 있습니다.

### 환경 변수 설정

Netlify 대시보드에서 `Site settings > Build & deploy > Environment variables` 섹션으로 이동하여 로컬 `.env` 파일과 동일하게 `LOSTARK_API_KEY`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`을 설정해야 합니다. Netlify Functions에서 이 변수들을 사용합니다.

## 🔄 시세 데이터 갱신 방법

시세 데이터는 Netlify Functions를 통해 로스트아크 API에서 주기적으로 가져와 Upstash Redis에 저장됩니다. 시세 갱신을 트리거하는 방법은 여러 가지가 있습니다.

### 1. Netlify Scheduled Functions (권장)

`netlify/functions/updatePrices.ts`는 Netlify Scheduled Functions로 설정하여 정기적으로 실행되도록 할 수 있습니다. `netlify.toml` 파일을 통해 스케줄을 설정할 수 있습니다. (예: 매 10분마다 실행)

### 2. GitHub Actions

GitHub Actions 워크플로우를 설정하여 특정 주기 또는 이벤트(예: 푸시) 발생 시 `/netlify/functions/updatePrices` 함수를 호출하도록 할 수 있습니다. 이는 서버리스 함수를 직접 호출하는 방식입니다.

### 3. 수동 호출

`/.netlify/functions/updatePrices` 엔드포인트에 GET/POST 요청을 보내 수동으로 시세를 갱신할 수 있습니다. (예: `curl -X POST https://YOUR_SITE_URL/.netlify/functions/updatePrices`)

## 🛠️ 기술 스택 및 프로젝트 구조

*   **Frontend**: React (TypeScript)
*   **Styling**: Bootstrap
*   **Backend (Serverless)**: Netlify Functions (TypeScript)
*   **Database**: Upstash Redis (캐시 및 시세 데이터 저장)
*   **API**: 로스트아크 오픈 API
*   **Deployment**: Netlify

```
oreha-calculator/
├── public/                 # 정적 파일 (index.html, 이미지 등)
├── src/
│   ├── components/         # React 컴포넌트 (Calculator, ComprehensiveCalculator, Maximizer 등)
│   ├── context/            # 전역 상태 관리 (ThemeContext 등)
│   ├── logic/              # 핵심 계산 로직 (calculator.ts, comprehensiveCalculator.ts, maximizer.ts 등)
│   ├── types/              # TypeScript 타입 정의 (data.ts)
│   ├── App.tsx             # 메인 애플리케이션 컴포넌트
│   └── index.tsx           # 애플리케이션 진입점
├── netlify/
│   └── functions/          # Netlify Functions (getPrices.ts, updatePrices.ts)
├── .env.example            # 환경 변수 템플릿
├── netlify.toml            # Netlify 설정 파일
├── package.json            # 프로젝트 메타데이터 및 종속성
├── README.md               # 프로젝트 설명 (현재 파일)
└── tsconfig.json           # TypeScript 설정
```

## 📐 로직 개요 및 흐름도

### 시세 데이터 흐름

1.  사용자 요청 (`src/App.tsx` 또는 계산기 컴포넌트)
2.  Netlify Function (`/.netlify/functions/getPrices`) 호출
    *   Redis에서 `latest_prices` 조회 시도
    *   실패 시 `cached_prices` 폴백
    *   `isCached` 플래그 및 경고 메시지 반환
3.  Frontend에서 데이터 수신 및 UI 업데이트

### 융화 재료 최적화 로직 (`src/logic/maximizer.ts`, `src/logic/comprehensiveCalculator.ts`)

*   `maximizer.ts`: LP 솔버 대신 반복 알고리즘(exhaustive search)을 사용하여 보유 재료로 만들 수 있는 융화 재료의 최대 개수를 계산합니다. 튼튼한 목재, 부드러운 목재, 벌목의 가루 등 모든 재료 변환 경로를 탐색하여 최적의 조합을 찾습니다.
*   `comprehensiveCalculator.ts`: `maximizer.ts`의 결과를 활용하여 '전부 판매', '최대 제작 후 판매', '최대 제작 후 사용' 시나리오별 총 가치를 비교하고 최적의 행동을 추천합니다.

## 🐛 문제 해결 가이드

*   **시세 정보가 로드되지 않거나 오래된 경우**:
    *   로컬 개발 환경에서는 `.env` 파일에 환경 변수가 올바르게 설정되었는지 확인하세요.
    *   배포 환경에서는 Netlify 환경 변수가 올바르게 설정되었는지 확인하세요.
    *   `/.netlify/functions/updatePrices` 함수가 주기적으로 실행되고 있는지 확인하세요. 수동으로 호출하여 갱신을 시도할 수 있습니다.
*   **계산 결과에 `NaN`이 표시되는 경우**:
    *   모든 재료의 시세가 올바르게 입력되었는지 확인하세요. 시세가 0이거나 누락된 경우 발생할 수 있습니다. (현재 `maximizer.ts` 로직은 `NaN`을 방지하도록 개선되었습니다.)
*   **로컬에서 `npm start` 시 에러 발생**:
    *   `npm install`을 다시 실행하여 모든 종속성이 올바르게 설치되었는지 확인하세요.
    *   `package.json`의 `scripts` 섹션을 확인하여 `start` 명령어가 올바른지 확인하세요.

## ✉️ 연락처 정보

버그 제보, 기능 제안 또는 기타 문의 사항은 아래 카카오톡 오픈채팅방을 통해 연락 주시면 감사하겠습니다.

*   [카카오톡 오픈채팅](https://open.kakao.com/o/s8MHZpei)
