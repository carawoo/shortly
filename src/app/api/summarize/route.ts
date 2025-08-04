import { NextResponse } from 'next/server';

// 메모리 기반 결과 저장 (실제로는 데이터베이스 사용 권장)
const summaryResults = new Map();

export async function POST(req: Request) {
  console.time('summary-processing');
  try {
    const body = await req.json();
    console.log('[POST] Make.com에서 받은 요약 데이터:', body);

    // Make.com에서 보낸 요약 결과 처리
    let summaryResult = '';
    let videoUrl = '';
    
    if (body.summary) {
      summaryResult = body.summary;
    } else if (body.message) {
      summaryResult = body.message;
    } else if (body.result) {
      summaryResult = body.result;
    } else {
      summaryResult = JSON.stringify(body);
    }

    videoUrl = body.videoUrl || body.url || '';

    console.log('[POST] 처리된 요약 결과:', summaryResult);
    console.log('[POST] 비디오 URL:', videoUrl);
    
    // ✅ 즉시 결과 저장 (동기화)
    if (videoUrl) {
      summaryResults.set(videoUrl, {
        summary: summaryResult,
        timestamp: new Date().toISOString()
      });
      console.log('[POST] 결과 즉시 저장 완료:', {
        url: videoUrl,
        summary: summaryResult,
        total_stored: summaryResults.size
      });
    } else {
      console.warn('[POST] videoUrl이 없어서 저장하지 않음');
    }
    
    // ✅ 즉시 응답 보내기
    const response = NextResponse.json({
      success: true,
      message: '요약 결과 수신 및 저장 완료',
      timestamp: new Date().toISOString()
    });
    
    console.timeEnd('summary-processing');
    return response;
    
  } catch (error) {
    console.timeEnd('summary-processing');
    console.error('[POST] API 처리 오류:', error);
    return NextResponse.json({
      success: false,
      error: '요약 처리 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

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