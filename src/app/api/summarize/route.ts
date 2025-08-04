import { NextResponse } from 'next/server';

// 메모리 기반 결과 저장 (trigger-summarize에서 저장)
const summaryResults = new Map();

// GET 요청으로 저장된 결과 조회
export async function GET(req: Request) {
  console.time('get-summarize');
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  
  console.log('[GET] summarize 요청 들어옴:', url);
  console.log('[GET] 현재 저장된 결과 개수:', summaryResults.size);
  console.log('[GET] 저장된 URL들:', Array.from(summaryResults.keys()));
  
  if (url && summaryResults.has(url)) {
    const result = summaryResults.get(url);
    console.log('[GET] 결과 찾음:', {
      url: url,
      summary: result.summary,
      timestamp: result.timestamp
    });
    
    console.timeEnd('get-summarize');
    return NextResponse.json({
      success: true,
      result: result.summary,
      videoUrl: url,
      timestamp: result.timestamp
    });
  }
  
  console.log('[GET] 결과 없음 - 아직 처리 안됨');
  console.timeEnd('get-summarize');
  return NextResponse.json({
    success: false,
    message: '아직 처리 안됨',
    stored_results: summaryResults.size,
    requested_url: url
  });
} 