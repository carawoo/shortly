import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET 요청으로 저장된 결과 조회
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const youtubeUrl = searchParams.get("url");

  console.log('[GET] summarize 요청 들어옴:', youtubeUrl);

  if (!youtubeUrl) {
    return NextResponse.json({ 
      success: false, 
      message: "URL이 필요합니다." 
    });
  }

  try {
    console.log('[GET] Supabase에서 결과 조회 시작...');
    
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('url', youtubeUrl)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('[GET] Supabase 조회 결과:', { data, error });

    if (error) {
      console.error('[GET] Supabase 조회 오류:', error);
      return NextResponse.json({ 
        success: false, 
        message: "데이터베이스 조회 중 오류가 발생했습니다." 
      });
    }

    if (data && data.length > 0) {
      const result = data[0];
      console.log('[GET] 결과 찾음:', result.summary);
      
      return NextResponse.json({ 
        success: true, 
        summary: result.summary,
        timestamp: result.created_at
      });
    }

    console.log('[GET] 결과 없음 - 처리 중');
    return NextResponse.json({ 
      success: false, 
      message: "처리 중" 
    });
    
  } catch (error) {
    console.error('[GET] 예외 발생:', error);
    return NextResponse.json({ 
      success: false, 
      message: "서버 오류가 발생했습니다." 
    });
  }
} 