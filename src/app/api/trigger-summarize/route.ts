import { NextResponse } from 'next/server';

// 메모리 기반 결과 저장
const summaryResults = new Map();

export async function POST(req: Request) {
  console.time('trigger-summarize');
  console.log('=== /api/trigger-summarize 시작 ===');
  
  try {
    // 1. 환경 변수 확인
    console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ 존재" : "❌ 없음");
    console.log("OPENAI_API_KEY 길이:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    
    const body = await req.json();
    const { url: youtubeUrl } = body;
    
    console.log('[POST] YouTube URL:', youtubeUrl);

    if (!youtubeUrl) {
      console.error('[POST] YouTube URL이 없습니다!');
      return NextResponse.json({
        success: false,
        error: 'YouTube URL이 필요합니다.',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // 2. 유튜브 영상 정보 추출 (여기선 dummy 사용)
    const dummyTranscript = `이 영상은 AI 서비스에 대한 설명입니다. 
    사용자들이 AI를 활용하여 다양한 작업을 수행할 수 있도록 도와주는 서비스입니다. 
    특히 자연어 처리와 이미지 생성 기능이 뛰어나며, 많은 기업과 개인들이 활용하고 있습니다. 
    이 서비스는 지속적으로 업데이트되어 더욱 강력한 기능을 제공하고 있습니다.`;

    console.log('[POST] 더미 트랜스크립트 생성 완료');

    // 3. GPT로 요약 요청
    console.time('openai-call');
    console.log('[POST] OpenAI API 호출 시작...');
    
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "아래 내용을 한국어로 간결하게 요약해줘. 핵심 내용만 2-3문장으로 요약하세요.",
          },
          {
            role: "user",
            content: dummyTranscript,
          },
        ],
      }),
    });
    
    console.timeEnd('openai-call');
    console.log('[POST] OpenAI API 응답 상태:', res.status);
    console.log('[POST] OpenAI API 응답 헤더:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[POST] OpenAI API 오류:', res.status, res.statusText);
      console.error('[POST] OpenAI API 오류 내용:', errorText);
      return NextResponse.json({
        success: false,
        error: `OpenAI API 호출 중 오류가 발생했습니다. (${res.status})`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const data = await res.json();
    console.log('[POST] OpenAI API 응답 데이터:', data);
    
    const summary = data.choices?.[0]?.message?.content || "요약 실패";
    console.log('[POST] 추출된 요약 결과:', summary);

    // 4. 메모리에 결과 저장
    console.log('[POST] 저장 직전 summary:', summary);
    console.log('[POST] 저장할 URL:', youtubeUrl);
    
    summaryResults.set(youtubeUrl, {
      summary: summary,
      timestamp: new Date().toISOString()
    });

    console.log('[POST] 결과 저장 완료:', {
      url: youtubeUrl,
      summary: summary,
      total_stored: summaryResults.size
    });

    console.timeEnd('trigger-summarize');
    console.log('=== /api/trigger-summarize 완료 ===');
    
    return NextResponse.json({
      success: true,
      message: '요약 요청이 성공적으로 처리되었습니다.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.timeEnd('trigger-summarize');
    console.error('[POST] 요약 처리 오류:', error);
    console.log('=== /api/trigger-summarize 오류 종료 ===');
    return NextResponse.json({
      success: false,
      error: '요약 처리 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'YouTube 요약 API',
    version: '1.0.0',
    status: 'active',
    stored_results: summaryResults.size,
    openai_key_exists: !!process.env.OPENAI_API_KEY,
    openai_key_length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
  });
} 