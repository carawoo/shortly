import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.time('trigger-summarize');
  try {
    const body = await req.json();
    console.log('Make.com webhook 호출 - 받은 데이터:', body);

    // 환경 변수 디버깅
    console.log('MAKE_WEBHOOK_URL 환경 변수:', process.env.MAKE_WEBHOOK_URL);
    
    if (!process.env.MAKE_WEBHOOK_URL) {
      console.error('MAKE_WEBHOOK_URL 환경 변수가 설정되지 않았습니다!');
      console.timeEnd('trigger-summarize');
      return NextResponse.json({
        success: false,
        error: 'MAKE_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Vercel 배포 URL 또는 환경 변수에서 가져오기
    const callbackUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/summarize`
      : process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/summarize`
      : 'https://shortly-omega-olive.vercel.app/api/summarize'; // fallback

    console.log('사용할 callback URL:', callbackUrl);

    // ✅ 즉시 응답 보내기
    const response = NextResponse.json({
      success: true,
      message: '요약 요청이 성공적으로 전송되었습니다.',
      timestamp: new Date().toISOString()
    });

    // ✅ 백그라운드에서 Make.com webhook 호출
    (async () => {
      try {
        console.time('make-webhook-call');
        const result = await fetch(process.env.MAKE_WEBHOOK_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            youtubeUrl: body.url,
            callbackUrl: callbackUrl
          }),
        });
        console.timeEnd('make-webhook-call');

        console.log('Make.com webhook 응답 상태:', result.status);
        console.log('Make.com webhook 응답 헤더:', Object.fromEntries(result.headers.entries()));

        // Make.com 응답 처리
        const contentType = result.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await result.json();
          console.log('JSON 응답 데이터:', data);
        } else {
          const text = await result.text();
          data = { message: text };
          console.log('텍스트 응답 데이터:', data);
        }
        
        console.log('백그라운드 Make.com 처리 완료:', data);
      } catch (error) {
        console.error('백그라운드 Make.com webhook 호출 오류:', error);
      }
    })();
    
    console.timeEnd('trigger-summarize');
    return response;
    
  } catch (error) {
    console.timeEnd('trigger-summarize');
    console.error('Make.com webhook 호출 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'Make.com webhook 호출 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Make.com webhook 호출 API',
    version: '1.0.0',
    status: 'active',
    webhook_url: process.env.MAKE_WEBHOOK_URL || 'NOT_SET',
    callback_url: process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/summarize`
      : 'Not set'
  });
} 