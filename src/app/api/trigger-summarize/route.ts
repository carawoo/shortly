import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// YouTube Video ID 추출 함수
function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// YouTube 자막 가져오기 함수
async function fetchYouTubeCaptions(videoId: string): Promise<string[]> {
  try {
    // YouTube 자막 트랙 정보 가져오기
    const captionResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const pageHtml = await captionResponse.text();
    
    // 자막 트랙 URL 추출 (한국어 우선, 영어 대체)
    const captionTracksMatch = pageHtml.match(/"captionTracks":\[(.*?)\]/);
    if (!captionTracksMatch) {
      return ['자막 정보를 찾을 수 없습니다'];
    }
    
    const captionTracksData = captionTracksMatch[1];
    
    // 한국어 자막 URL 찾기
    let captionUrlMatch = captionTracksData.match(/"languageCode":"ko".*?"baseUrl":"([^"]*)"/) || 
                         captionTracksData.match(/"languageCode":"en".*?"baseUrl":"([^"]*)"/) ||
                         captionTracksData.match(/"baseUrl":"([^"]*)"/);
    
    if (!captionUrlMatch) {
      return ['자막을 가져올 수 없습니다'];
    }
    
    const captionUrl = captionUrlMatch[1].replace(/\\u0026/g, '&');
    
    // 자막 XML 데이터 가져오기
    const captionXmlResponse = await fetch(captionUrl);
    if (!captionXmlResponse.ok) {
      return ['자막 데이터를 가져올 수 없습니다'];
    }
    
    const captionXml = await captionXmlResponse.text();
    
    // XML에서 자막 텍스트와 타임스탬프 추출
    const textMatches = captionXml.match(/<text start="([^"]*)"[^>]*>([^<]*)</g);
    if (!textMatches) {
      return ['자막을 파싱할 수 없습니다'];
    }
    
    const captions = textMatches.map(match => {
      const startMatch = match.match(/start="([^"]*)"/);
      const textMatch = match.match(/>([^<]*)</);
      
      if (startMatch && textMatch) {
        const startTime = parseFloat(startMatch[1]);
        const minutes = Math.floor(startTime / 60);
        const seconds = Math.floor(startTime % 60);
        const text = textMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        
        return `[${minutes}:${seconds.toString().padStart(2, '0')}] ${text}`;
      }
      return '';
    }).filter(caption => caption.length > 0);
    
    return captions.slice(0, 20); // 최대 20개 자막만 반환
    
  } catch (error) {
    console.error('자막 가져오기 실패:', error);
    return ['자막을 가져올 수 없습니다'];
  }
}

// YouTube 비디오 데이터 가져오기 함수 (썸네일 + 메타데이터)
async function fetchYouTubeVideoData(videoId: string) {
  try {
    // YouTube Data API가 없는 경우 oEmbed API를 사용하여 기본 정보 가져오기
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!oembedResponse.ok) {
      throw new Error('YouTube oEmbed API 호출 실패');
    }
    
    const oembedData = await oembedResponse.json();
    
    // 추가로 YouTube 페이지를 스크래핑하여 더 많은 정보 가져오기
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    if (!pageResponse.ok) {
      throw new Error('YouTube 페이지 접근 실패');
    }
    
    const pageHtml = await pageResponse.text();
    
    // 메타데이터 추출
    const titleMatch = pageHtml.match(/<meta property="og:title" content="([^"]*)">/);
    const descriptionMatch = pageHtml.match(/<meta property="og:description" content="([^"]*)">/);
    const channelMatch = pageHtml.match(/"ownerChannelName":"([^"]*)"/) || pageHtml.match(/"author":"([^"]*)"/);
    const durationMatch = pageHtml.match(/"lengthSeconds":"([^"]*)"/);
    const viewCountMatch = pageHtml.match(/"viewCount":"([^"]*)"/);
    
    // 썸네일 URL 생성 (YouTube 표준 패턴)
    const thumbnails = {
      default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
      medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
    
    // 자막 정보 가져오기
    const captions = await fetchYouTubeCaptions(videoId);
    
    return {
      title: titleMatch ? titleMatch[1] : oembedData.title || '제목을 가져올 수 없습니다',
      description: descriptionMatch ? descriptionMatch[1] : '설명을 가져올 수 없습니다',
      channelTitle: channelMatch ? channelMatch[1] : oembedData.author_name || '채널명을 가져올 수 없습니다',
      duration: durationMatch ? `${Math.floor(parseInt(durationMatch[1]) / 60)}분 ${parseInt(durationMatch[1]) % 60}초` : '정보 없음',
      viewCount: viewCountMatch ? parseInt(viewCountMatch[1]).toLocaleString() : '정보 없음',
      thumbnails,
      captions
    };
    
  } catch (error) {
    console.error('YouTube 데이터 가져오기 실패:', error);
    throw error;
  }
}

// 메모리 기반 결과 저장
const summaryResults = new Map();

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  console.time('trigger-summarize');
  console.log('=== /api/trigger-summarize 시작 ===');
  
  try {
    // 1. 환경 변수 확인
    console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✅ 존재" : "❌ 없음");
    console.log("OPENAI_API_KEY 길이:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ 존재" : "❌ 없음");
    console.log("SUPABASE_URL 값:", process.env.SUPABASE_URL);
    console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ 존재" : "❌ 없음");
    console.log("SUPABASE_SERVICE_ROLE_KEY 길이:", process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0);
    
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

    // 2. 유튜브 영상 정보 추출
    console.log('[POST] YouTube 영상 정보 추출 시작...');
    
    let videoContent = '';
    
    try {
      // YouTube Video ID 추출
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('유효하지 않은 YouTube URL입니다.');
      }
      
      console.log('[POST] Video ID:', videoId);
      
      // YouTube 영상 메타데이터 가져오기
      const videoData = await fetchYouTubeVideoData(videoId);
      
      // 영상 제목, 설명, 썸네일, 자막을 조합하여 컨텐츠 생성
      videoContent = `제목: ${videoData.title}

설명: ${videoData.description}

채널: ${videoData.channelTitle}
길이: ${videoData.duration}
조회수: ${videoData.viewCount}

썸네일: ${videoData.thumbnails.high}

타임스탬프별 내용 (자막 기반):
${videoData.captions.join('\n')}`;

      console.log('[POST] YouTube 메타데이터 추출 완료');
      console.log('[POST] 제목:', videoData.title);
      console.log('[POST] 채널:', videoData.channelTitle);
      
    } catch (error) {
      console.error('[POST] YouTube 정보 추출 실패:', error);
      // 실패 시 URL 기반으로 일반적인 메시지 생성
      videoContent = `YouTube 영상 URL: ${youtubeUrl}

이 영상의 상세 정보를 가져올 수 없어 URL을 기반으로 요약을 시도합니다.
실제 영상 내용을 분석하려면 영상이 공개되어 있고 접근 가능한지 확인해주세요.`;
    }

    console.log("YouTube URL:", youtubeUrl);
    console.log("Video Content:", videoContent.substring(0, 200) + '...');
    console.log('[POST] 영상 콘텐츠 준비 완료');

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
        model: "gpt-4o",
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `당신은 YouTube 영상 요약 전문가입니다. 제공된 영상 정보(제목, 설명, 자막 타임스탬프)를 활용하여 다음 구조로 상세하게 요약해주세요:

## 🖼️ 영상 정보
- 제목, 채널, 길이, 조회수 등 기본 정보 요약

## 📝 전체 내용 요약
영상의 주요 내용과 메시지를 3-4문장으로 요약

## ⏰ 타임스탬프별 주요 내용
자막 정보가 제공된 경우, 시간대별로 중요한 내용 정리
- [시간] 주요 내용
- [시간] 주요 내용
- [시간] 주요 내용
(자막이 없는 경우 제목과 설명 기반으로 주제별 정리)

## 🎯 핵심 포인트
- 영상에서 다룬 주요 주제와 메시지
- 구체적인 수치, 예시, 방법론 등이 있다면 포함

## ⭐ 중요 내용 하이라이트  
- 핵심 인사이트나 액션 아이템 3-5개
- 시청자가 기억해야 할 중요한 점들

## 💡 결론 및 시사점
영상의 핵심 메시지와 시청자가 얻을 수 있는 가치

한국어로 작성하되, 타임스탬프 정보를 최대한 활용하여 시간 흐름에 따른 내용 변화를 반영해주세요.`,
          },
          {
            role: "user",
            content: videoContent,
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
    console.log("Summary:", summary);
    console.log('[POST] 추출된 요약 결과:', summary);

    // 4. 메모리에 결과 저장
    console.log('[POST] 저장 직전 summary:', summary);
    console.log('[POST] 저장할 URL:', youtubeUrl);
    
    summaryResults.set(youtubeUrl, {
      summary: summary,
      timestamp: new Date().toISOString()
    });

    console.log('[POST] 메모리 저장 완료:', {
      url: youtubeUrl,
      summary: summary,
      total_stored: summaryResults.size
    });

    // 5. Supabase에 결과 저장
    try {
      console.log('[POST] Supabase 저장 시작...');
      console.log('[POST] Supabase INSERT 실행 전 - URL:', youtubeUrl);
      console.log('[POST] Supabase INSERT 실행 전 - Summary:', summary);
      console.log('[POST] Supabase URL 확인:', process.env.SUPABASE_URL);
      console.log('[POST] Supabase Key 존재 여부:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      const insertData = { 
        url: youtubeUrl, 
        summary: summary, 
        status: 'done'
        // created_at은 자동으로 설정되도록 제거
      };
      
      console.log('[POST] INSERT할 데이터:', insertData);
      
      const { data, error } = await supabase
        .from('summaries')
        .insert([insertData])
        .select(); // 삽입된 데이터를 반환받기 위해 select() 추가

      console.log('[POST] Supabase INSERT 실행 완료');
      console.log('[POST] Supabase 응답 data:', data);
      console.log('[POST] Supabase 응답 error:', error);
      
      if (error) {
        console.error("Supabase insert error:", error);
        console.error('[POST] Supabase 저장 오류:', error);
        console.error('[POST] Supabase 오류 코드:', error.code);
        console.error('[POST] Supabase 오류 메시지:', error.message);
        console.error('[POST] Supabase 오류 상세:', error.details);
      } else {
        console.log('[POST] Supabase 저장 성공:', data);
        console.log('[POST] Supabase INSERT 성공 - 저장된 데이터:', data);
      }
    } catch (supabaseError) {
      console.error('[POST] Supabase 저장 중 예외 발생:', supabaseError);
      console.error("Supabase insert exception:", supabaseError);
      console.error('[POST] 예외 타입:', typeof supabaseError);
      console.error('[POST] 예외 메시지:', supabaseError instanceof Error ? supabaseError.message : 'Unknown error');
    }

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
  // Supabase 연결 테스트
  let supabaseTest = null;
  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('count')
      .limit(1);
    
    supabaseTest = {
      success: !error,
      error: error ? error.message : null,
      data: data
    };
  } catch (e) {
    supabaseTest = {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
      data: null
    };
  }

  return NextResponse.json({
    message: 'YouTube 요약 API',
    version: '1.0.0',
    status: 'active',
    stored_results: summaryResults.size,
    openai_key_exists: !!process.env.OPENAI_API_KEY,
    openai_key_length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    supabase_url_exists: !!process.env.SUPABASE_URL,
    supabase_key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabase_test: supabaseTest
  });
} 