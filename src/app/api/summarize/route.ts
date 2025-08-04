import { NextResponse } from 'next/server';

// 메모리 기반 결과 저장 (trigger-summarize에서 저장)
const summaryResults = new Map();

// GET 요청으로 저장된 결과 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const youtubeUrl = searchParams.get("url");

  console.log('[GET] summarize 요청 들어옴:', youtubeUrl);
  console.log('[GET] 현재 저장된 결과 개수:', summaryResults.size);

  if (youtubeUrl && summaryResults.has(youtubeUrl)) {
    const result = summaryResults.get(youtubeUrl);
    console.log('[GET] 결과 찾음:', result.summary);
    
    return NextResponse.json({ 
      success: true, 
      summary: result.summary 
    });
  }

  console.log('[GET] 결과 없음 - 처리 중');
  return NextResponse.json({ 
    success: false, 
    message: "처리 중" 
  });
} 