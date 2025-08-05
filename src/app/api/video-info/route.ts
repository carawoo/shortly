import { NextResponse } from 'next/server';

// YouTube Video ID 추출 함수
function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// YouTube 페이지에서 메타데이터 추출
async function fetchVideoMetadata(videoId: string) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // 제목 추출
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : null;
    
    // 설명 추출 (메타태그에서)
    const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/);
    const description = descriptionMatch ? descriptionMatch[1] : null;
    
    // 업로드 날짜 추출
    const uploadDateMatch = html.match(/"uploadDate":"([^"]+)"/);
    const uploadDate = uploadDateMatch ? uploadDateMatch[1] : null;
    
    // 조회수 추출
    const viewCountMatch = html.match(/"viewCount":"(\d+)"/);
    const viewCount = viewCountMatch ? parseInt(viewCountMatch[1]) : null;
    
    // 채널명 추출
    const channelMatch = html.match(/"author":"([^"]+)"/);
    const channelName = channelMatch ? channelMatch[1] : null;
    
    // 동영상 길이 추출
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : null;
    
    return {
      title: title ? decodeURIComponent(title.replace(/\\u[\dA-F]{4}/gi, '')) : null,
      description,
      uploadDate,
      viewCount,
      channelName,
      duration,
      thumbnails: {
        default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
        maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      }
    };
    
  } catch (error) {
    console.error('메타데이터 추출 오류:', error);
    throw error;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const youtubeUrl = searchParams.get("url");

  if (!youtubeUrl) {
    return NextResponse.json({ 
      success: false, 
      message: "YouTube URL이 필요합니다." 
    });
  }

  try {
    const videoId = extractVideoId(youtubeUrl);
    
    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        message: "유효하지 않은 YouTube URL입니다." 
      });
    }

    const metadata = await fetchVideoMetadata(videoId);
    
    return NextResponse.json({ 
      success: true, 
      videoId,
      ...metadata
    });
    
  } catch (error: any) {
    console.error('[GET] 비디오 정보 가져오기 실패:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: "비디오 정보를 가져오는 중 오류가 발생했습니다."
    });
  }
}