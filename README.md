# Shortly - 비디오 요약 서비스

AI를 사용하여 비디오를 빠르고 정확하게 요약하는 Next.js 웹 애플리케이션입니다.

## 주요 기능

- 🎥 **비디오 링크 입력**: YouTube 등 다양한 플랫폼의 비디오 링크를 입력할 수 있습니다
- ⚡ **빠른 요약**: AI가 비디오 내용을 빠르게 분석하여 핵심을 요약합니다
- 🎯 **정확한 분석**: 고급 AI 모델을 사용하여 정확하고 신뢰할 수 있는 요약을 제공합니다
- 🔒 **안전한 처리**: 개인정보를 보호하며 안전하게 비디오를 처리합니다

## 기술 스택

- **Frontend**: Next.js 13.5.6, TypeScript, Tailwind CSS
- **Styling**: Tailwind CSS with dark mode support
- **Development**: ESLint, PostCSS
- **API**: Next.js API Routes

## 시작하기

### 필수 요구사항

- Node.js 16.20.2 이상
- npm, yarn, pnpm, 또는 bun

### 설치 및 실행

1. 저장소를 클론합니다:
```bash
git clone <repository-url>
cd shortly
```

2. 의존성을 설치합니다:
```bash
npm install
```

3. 환경 변수를 설정합니다 (선택사항):
```bash
# .env.local 파일을 생성하고 다음 내용을 추가하세요
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_NAME=Shortly
NEXT_PUBLIC_VIDEO_SUMMARY_API_KEY=your_api_key_here
NEXT_PUBLIC_VIDEO_SUMMARY_API_URL=https://api.example.com/summarize
NEXT_PUBLIC_ENABLE_LOGGING=true
NEXT_PUBLIC_ENABLE_VIDEO_SUMMARY=true
NEXT_PUBLIC_ENABLE_DARK_MODE=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

4. 개발 서버를 실행합니다:
```bash
npm run dev
```

5. 브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인합니다.

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 생성하여 다음 환경 변수들을 설정할 수 있습니다:

### 필수 환경 변수
- `NEXT_PUBLIC_API_URL`: API 기본 URL (기본값: http://localhost:3000/api)
- `NEXT_PUBLIC_APP_NAME`: 앱 이름 (기본값: Shortly)

### 선택적 환경 변수
- `NEXT_PUBLIC_VIDEO_SUMMARY_API_KEY`: 비디오 요약 API 키
- `NEXT_PUBLIC_VIDEO_SUMMARY_API_URL`: 비디오 요약 API URL
- `NEXT_PUBLIC_ENABLE_LOGGING`: 로깅 활성화 (true/false)
- `NEXT_PUBLIC_ENABLE_VIDEO_SUMMARY`: 비디오 요약 기능 활성화 (true/false)
- `NEXT_PUBLIC_ENABLE_DARK_MODE`: 다크 모드 활성화 (true/false)
- `NEXT_PUBLIC_ENABLE_ANALYTICS`: 분석 기능 활성화 (true/false)

## 프로젝트 구조

```
shortly/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── summarize/
│   │   │       └── route.ts    # 비디오 요약 API
│   │   ├── page.tsx            # 홈페이지 컴포넌트
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   └── globals.css         # 전역 스타일
│   └── types/                  # TypeScript 타입 정의
├── public/                     # 정적 파일
├── .env.local                  # 환경 변수 (로컬)
├── package.json
└── README.md
```

## 개발

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행

## API 엔드포인트

### POST /api/summarize
비디오 URL을 받아서 요약을 생성합니다.

**요청:**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=..."
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "title": "비디오 제목",
    "summary": "요약 내용",
    "duration": "10:30",
    "keyPoints": ["포인트 1", "포인트 2"],
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "message": "비디오 요약이 완료되었습니다."
}
```

## 배포

이 프로젝트는 Vercel에 쉽게 배포할 수 있습니다:

1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 설정

## 라이선스

MIT License

## 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## TODO

- [x] 기본 UI 구현
- [x] API 라우트 생성
- [x] 환경 변수 설정
- [ ] 실제 비디오 요약 API 연동
- [ ] 요약 결과 저장 기능
- [ ] 사용자 인증 시스템
- [ ] 요약 히스토리 기능
- [ ] 다양한 비디오 플랫폼 지원
- [ ] 다국어 지원
- [ ] PWA 기능 추가
# Environment variable test
