import { NextResponse } from 'next/server';

// 메모리 기반 결과 저장 (실제로는 데이터베이스 사용 권장)
const summaryResults = new Map();

export async function POST(req: Request) {
  console.time('summary-processing');
  try {
    const body = await req.json();
    console.log('Make.com에서 받은 요약 데이터:', body);

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

    console.log('처리된 요약 결과:', summaryResult);
    console.log('비디오 URL:', videoUrl);
    
    // 결과 저장
    if (videoUrl) {
      summaryResults.set(videoUrl, {
        summary: summaryResult,
        timestamp: new Date().toISOString()
      });
    }
    
    console.timeEnd('summary-processing');
    return NextResponse.json({
      success: true,
      result: summaryResult,
      videoUrl: videoUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.timeEnd('summary-processing');
    console.error('API 처리 오류:', error);
    return NextResponse.json({
      success: false,
      error: '요약 처리 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET 요청으로 저장된 결과 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  
  if (url && summaryResults.has(url)) {
    const result = summaryResults.get(url);
    return NextResponse.json({
      success: true,
      result: result.summary,
      videoUrl: url,
      timestamp: result.timestamp
    });
  }
  
  return NextResponse.json({
    message: 'Shortly 비디오 요약 API',
    version: '1.0.0',
    status: 'active',
    webhook_url: 'https://shortly-omega-olive.vercel.app/api/summarize',
    stored_results: summaryResults.size
  });
} 