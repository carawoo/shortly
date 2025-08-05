'use client';

import { useState, useEffect } from 'react';

// 캐시 무효화를 위한 강제 변경사항
const CACHE_BUSTER = 'fix-typescript-null-error-' + Date.now();

export default function Home() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSummaries, setRecentSummaries] = useState<Array<{url: string, summary: string, timestamp: string}>>([]);
  const [urlValid, setUrlValid] = useState(true);
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);
  const [isRecentSummariesExpanded, setIsRecentSummariesExpanded] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{
    title: string;
    description: string;
    uploadDate: string;
    viewCount: number;
    channelName: string;
    duration: number;
    thumbnails: {
      default: string;
      medium: string;
      high: string;
      standard: string;
      maxres: string;
    };
  } | null>(null);
  const [videoInfoLoading, setVideoInfoLoading] = useState(false);


  // 유튜브 URL 검증 함수
  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
    return youtubeRegex.test(url.trim());
  };

  // YouTube Video ID 추출 함수
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // 해시태그 추출 함수
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[가-힣a-zA-Z0-9_]+/g;
    const hashtags = text.match(hashtagRegex);
    return hashtags ? hashtags.slice(0, 8) : []; // 최대 8개
  };

  // 시간 포맷팅 함수 (초를 시:분:초로 변환)
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // 조회수 포맷팅 함수
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return count.toString();
    }
  };

  // 업로드 날짜 포맷팅 함수
  const formatUploadDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}주 전`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}개월 전`;
    } else {
      return `${Math.floor(diffDays / 365)}년 전`;
    }
  };

  // 비디오 정보 가져오기 함수
  const fetchVideoInfo = async (videoUrl: string) => {
    setVideoInfoLoading(true);
    try {
      const response = await fetch(`/api/video-info?url=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();
      
      if (data.success) {
        setVideoInfo(data);
      } else {
        console.warn('비디오 정보 가져오기 실패:', data.message);
      }
    } catch (err) {
      console.error('비디오 정보 가져오기 오류:', err);
    } finally {
      setVideoInfoLoading(false);
    }
  };

  // 타임스탬프 추출 및 파싱 함수
  const parseTimestamps = (text: string) => {
    const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+?)(?=\n|$)/g;
    const sections = [];
    let match;
    
    while ((match = timestampRegex.exec(text)) !== null) {
      const [, timestamp, content] = match;
      sections.push({
        timestamp,
        content: content.trim(),
        seconds: convertTimestampToSeconds(timestamp)
      });
    }
    
    return sections;
  };

  // 타임스탬프를 초 단위로 변환
  const convertTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  };

  // YouTube 링크에 타임스탬프 추가
  const getYouTubeTimestampUrl = (videoId: string, seconds: number): string => {
    return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
  };

  // 요약 내용을 섹션별로 분리
  const parseSummaryIntoSections = (text: string) => {
    const sections = [];
    
    // 주요 섹션 헤더 패턴
    const sectionRegex = /##\s*(.+?)(?=\n)/g;
    const parts = text.split(/##\s*(.+?)(?=\n)/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i]?.trim();
      const content = parts[i + 1]?.trim();
      
      if (title && content) {
        // 이 섹션에서 타임스탬프 찾기
        const timestamps = parseTimestamps(content);
        
        sections.push({
          title,
          content,
          timestamps,
          isKeySection: title.includes('핵심') || title.includes('주요') || title.includes('요약')
        });
      }
    }
    
    return sections;
  };

  // 핵심 포인트 추출
  const extractKeyPoints = (text: string): string[] => {
    const keyPointPatterns = [
      /[•·▪▫-]\s*(.+?)(?=\n|$)/g,
      /\d+\.\s*(.+?)(?=\n|$)/g,
      /✓\s*(.+?)(?=\n|$)/g,
      /⭐\s*(.+?)(?=\n|$)/g
    ];
    
    const keyPoints: string[] = [];
    
    for (const pattern of keyPointPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const point = match[1]?.trim();
        if (point && point.length > 10 && !keyPoints.includes(point)) {
          keyPoints.push(point);
        }
      }
    }
    
    return keyPoints.slice(0, 5); // 최대 5개 핵심 포인트
  };

  // 마크다운을 HTML로 변환하는 함수
  const convertMarkdownToHtml = (text: string): string => {
    // 해시태그 섹션 제거
    let html = text.replace(/## 🏷️ 핵심 키워드[\s\S]*?(?=## |$)/g, '');
    
    // 해시태그 라인 제거
    html = html.replace(/#[가-힣a-zA-Z0-9_\s]+/g, '');
    
    // 줄바꿈을 기준으로 분할
    const lines = html.split('\n');
    const result = [];
    let currentList = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // 빈 줄이면 현재 리스트 닫기
        if (currentList.length > 0) {
          result.push('<ul>' + currentList.join('') + '</ul>');
          currentList = [];
        }
        continue;
      }
      
      if (/^#{1,3}\s*/.test(line)) {
        // 제목 처리 (#, ##, ### 지원, 띄어쓰기 유연하게 처리)
        if (currentList.length > 0) {
          result.push('<ul>' + currentList.join('') + '</ul>');
          currentList = [];
        }
        const hashCount = line.match(/^#+/)?.[0].length || 2;
        const title = line.replace(/^#+\s*/, '').trim();
        const tag = hashCount === 1 ? 'h1' : hashCount === 2 ? 'h2' : 'h3';
        result.push(`<${tag}>${title}</${tag}>`);
      } else if (/^[-*+]\s*/.test(line)) {
        // 리스트 항목 처리 (-, *, + 지원, 띄어쓰기 유연하게 처리)
        const item = line.replace(/^[-*+]\s*/, '').trim();
        const boldItem = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        currentList.push(`<li>${boldItem}</li>`);
      } else {
        // 일반 텍스트 처리
        if (currentList.length > 0) {
          result.push('<ul>' + currentList.join('') + '</ul>');
          currentList = [];
        }
        const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        result.push(`<p>${boldText}</p>`);
      }
    }
    
    // 마지막에 남은 리스트 처리
    if (currentList.length > 0) {
      result.push('<ul>' + currentList.join('') + '</ul>');
    }
    
    return result.join('');
  };

  // 로컬 스토리지 키
  const STORAGE_KEY = 'shortly_recent_summaries';

  // 로컬 스토리지에서 데이터 로드
  const loadFromStorage = (): Array<{url: string, summary: string, timestamp: string}> => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('로컬 스토리지 로드 오류:', error);
      return [];
    }
  };

  // 로컬 스토리지에 데이터 저장
  const saveToStorage = (summaries: Array<{url: string, summary: string, timestamp: string}>) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
    } catch (error) {
      console.error('로컬 스토리지 저장 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedSummaries = loadFromStorage();
    setRecentSummaries(savedSummaries);
  }, []);

  // recentSummaries 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (recentSummaries.length > 0) {
      saveToStorage(recentSummaries);
    }
  }, [recentSummaries]);

  // 전체 요약 기록 삭제
  const clearAllSummaries = () => {
    if (confirm('모든 요약 기록을 삭제하시겠습니까?')) {
      setRecentSummaries([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSummarize = async () => {
    if (!url.trim()) {
      setError('YouTube URL을 입력해주세요.');
      return;
    }

    // 유튜브 URL 검증
    if (!isValidYouTubeUrl(url)) {
      setError('올바른 YouTube 영상 URL을 입력해주세요. (예: https://www.youtube.com/watch?v=...)');
      return;
    }

    // Video ID 추출 및 저장
    const videoId = extractVideoId(url);
    if (videoId) {
      setCurrentVideoId(videoId);
    }

    setLoading(true);
    setError('');
    setSummary('');
    
    // 비디오 정보 가져오기 (병렬 처리)
    fetchVideoInfo(url);

    try {
      // 1. 요약 트리거
      const triggerRes = await fetch('/api/trigger-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const triggerData = await triggerRes.json();

      if (!triggerData.success) {
        setError(triggerData.error || '요약이 실패했어요. 다시 시도해 주세요. ');
        setLoading(false);
        return;
      }

      setSummary('요약을 진행 중입니다! 잠시만 기다려주세요.');

      // 2. 폴링으로 결과 대기 (15초 초기 대기 후 시작)
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15초 대기
      
      try {
        const summaryText = await pollForResult(url, 60000, 3000); // 1분까지 대기
        setSummary(summaryText);
        
        // 최근 요약에 추가 (중복 제거 및 최대 10개 제한)
        setRecentSummaries(prev => {
          // 동일한 URL이 있으면 제거
          const filteredPrev = prev.filter(item => item.url !== url);
          
          // 새 항목을 맨 앞에 추가하고 최대 10개까지만 유지
          return [{
            url,
            summary: summaryText,
            timestamp: new Date().toISOString()
          }, ...filteredPrev].slice(0, 10);
        });
      } catch (e) {
        setError('요약 결과를 가져오지 못했습니다. 다시 시도해주세요.');
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요약 처리 중 오류가 발생했습니다.');
      setLoading(false);
      console.error(err);
    }
  };

  // 간단한 폴링 로직
  const pollForResult = async (url: string, timeout = 30000, interval = 2000): Promise<string> => {
    const start = Date.now();
    let attempts = 0;

    console.log('[폴링 시작] URL:', url, '타임아웃:', timeout, '간격:', interval);

    while (Date.now() - start < timeout) {
      try {
        const res = await fetch(`/api/summarize?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        attempts++;
        console.log(`[폴링 ${attempts}] 응답:`, data);

        if (data.success && data.summary) {
          console.log('[폴링 성공] 결과 찾음:', data.summary);
          return data.summary;
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (err) {
        console.error(`[폴링 ${attempts}] 오류:`, err);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    // 타임아웃
    throw new Error('요약 처리 시간이 초과되었습니다. 다시 시도해주세요.');
  };



  return (
    <div className="app-container">
      {/* 배경 패턴 */}
      <div className="background-pattern"></div>
      
      <main className="main-content">
        <div className="main-container">
          {/* 메인 헤더 */}
          <div className="hero-section">
            <div className="hero-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
                        <h1 className="hero-title">
              <p>Shortly</p>
              <span className="language-support-badge">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                </svg>
                다국어 번역
              </span>
            </h1>
            <p className="hero-description">
              🤖 AI를 사용하여 YouTube 영상을 빠르고 정확하게 요약합니다.<br />
              ✨ 복잡한 내용을 간단하고 이해하기 쉽게 만들어드릴게요.<br />
              🌍 해외 영상도 자동으로 한국어로 번역하여 제공합니다.
            </p>
          </div>

          <div className="content-grid">
            {/* 메인 입력 섹션 */}
            <div>
              {/* 입력 폼 */}
              <div className="input-form">
                <div className="form-group">
                  <label htmlFor="url" className="form-label">
                    YouTube URL
                  </label>
                  <div className="input-container">
                    <div className="input-icon">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="url"
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newUrl = e.target.value;
                        setUrl(newUrl);
                        // 실시간 URL 검증
                        if (newUrl.trim() && !isValidYouTubeUrl(newUrl)) {
                          setUrlValid(false);
                        } else {
                          setUrlValid(true);
                          setError(''); // 올바른 URL이면 에러 메시지 제거
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`url-input ${!urlValid ? 'url-input-error' : ''}`}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* URL 검증 인라인 경고 */}
                {url.trim() && !urlValid && (
                  <div className="url-warning">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    유효한 YouTube URL을 입력해주세요
                  </div>
                )}
                
                <button 
                  onClick={handleSummarize} 
                  disabled={loading || !url.trim() || !urlValid}
                  className="submit-button"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      AI가 분석 중입니다...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      요약 시작하기
                    </>
                  )}
                </button>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="error-message">
                  <div className="error-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="error-text">{error}</div>
                </div>
              )}

              {/* 요약 결과 */}
              {summary && (
                <div className="summary-result">
                  {/* 썸네일 표시 */}
                  {currentVideoId && (
                    <div 
                      className="video-thumbnail"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${currentVideoId}`, '_blank')}
                      title="YouTube에서 영상 보기"
                    >
                      <img 
                        src={videoInfo?.thumbnails?.maxres || `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`}
                        alt="YouTube 썸네일"
                        className="thumbnail-image"
                        onError={(e) => {
                          // 고화질 썸네일이 없으면 차선책들로 대체
                          const fallbacks = [
                            `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`,
                            `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`,
                            `https://img.youtube.com/vi/${currentVideoId}/default.jpg`
                          ];
                          const currentSrc = e.currentTarget.src;
                          const currentIndex = fallbacks.findIndex(url => currentSrc.includes(url.split('/').pop() || ''));
                          if (currentIndex < fallbacks.length - 1) {
                            e.currentTarget.src = fallbacks[currentIndex + 1];
                          }
                        }}
                      />
                      <div className="thumbnail-overlay">
                        <div className="play-button">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                        {videoInfo?.duration && (
                          <div className="video-duration">
                            {formatDuration(videoInfo.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 영상 정보 */}
                  {videoInfo && (
                    <div className="summary-card">
                      <h3 className="summary-card-title">
                        <span className="card-number">1</span>
                        **영상 정보**
                      </h3>
                      <div className="summary-card-content">
                        <div className="video-info-main">
                          <h4 className="video-title">{videoInfo.title}</h4>
                          <div className="video-channel">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            {videoInfo.channelName}
                          </div>
                        </div>
                        
                        <div className="video-stats">
                          {videoInfo.viewCount && (
                            <div className="video-stat">
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                              조회수 {formatViewCount(videoInfo.viewCount)}회
                            </div>
                          )}
                          
                          {videoInfo.duration && (
                            <div className="video-stat">
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                              </svg>
                              {formatDuration(videoInfo.duration)}
                            </div>
                          )}
                          
                          {videoInfo.uploadDate && (
                            <div className="video-stat">
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                              </svg>
                              {formatUploadDate(videoInfo.uploadDate)}
                            </div>
                          )}
                        </div>
                        
                        {videoInfo.description && (
                          <div className="video-description">
                            <p>{videoInfo.description.length > 150 ? 
                              `${videoInfo.description.substring(0, 150)}...` : 
                              videoInfo.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="summary-header">
                    <h2 className="summary-title">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      AI 요약 결과
                    </h2>
                  </div>

                  {/* 핵심 포인트 요약 */}
                  {(() => {
                    const keyPoints = extractKeyPoints(summary);
                    return keyPoints.length > 0 ? (
                      <div className="summary-card">
                        <h3 className="summary-card-title">
                          <span className="card-number">2</span>
                          **핵심 포인트의 특징**: 조회수를 폭발적으로 올리는 영상의 공통적인 특징을 분석해요.
                        </h3>
                        <div className="summary-card-content">
                          <div className="key-points-list">
                            {keyPoints.map((point, index) => (
                              <div key={index} className="key-point-item">
                                <span className="key-point-number">{index + 1}</span>
                                <span className="key-point-text">{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* 섹션별 요약 */}
                  {(() => {
                    const sections = parseSummaryIntoSections(summary);
                    return sections.length > 0 ? (
                      <div className="summary-card">
                        <h3 className="summary-card-title">
                          <span className="card-number">3</span>
                          **콘텐츠 제작 팁**: 이러한 트렌드를 활용해 자신의 콘텐츠를 효과적으로 제작하는 방법을 알려드려요.
                        </h3>
                        <div className="summary-card-content">
                          <div className="sections-list">
                            {sections.map((section, index) => (
                              <div key={index} className={`section-item ${section.isKeySection ? 'key-section' : ''}`}>
                                <div className="section-header">
                                  <h4 className="section-title">{section.title}</h4>
                                  {section.timestamps.length > 0 && (
                                    <span className="timestamps-count">
                                      {section.timestamps.length}개 구간
                                    </span>
                                  )}
                                </div>
                                
                                {section.timestamps.length > 0 && (
                                  <div className="timestamps-list">
                                    {section.timestamps.map((ts, tsIndex) => (
                                      <div key={tsIndex} className="timestamp-item">
                                        <button
                                          className="timestamp-link"
                                          onClick={() => window.open(getYouTubeTimestampUrl(currentVideoId, ts.seconds), '_blank')}
                                          title="YouTube에서 해당 구간 보기"
                                        >
                                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                          </svg>
                                          {ts.timestamp}
                                        </button>
                                        <span className="timestamp-content">{ts.content}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="section-content">
                                  <p>{section.content.replace(/\d{1,2}:\d{2}(?::\d{2})?\s*[-–—]?\s*.+/g, '').trim()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* 전체 요약 내용 */}
                  <div className="summary-card">
                    <h3 className="summary-card-title">
                      <span className="card-number">4</span>
                      **해외 SNS에서 인기 있는 영상은 주로 짧고 강렬한 메시지를 전달하는 콘텐츠예요.**
                    </h3>
                    <div className="summary-card-content">
                       {/* 해시태그 칩 표시 */}
                       {(() => {
                         const hashtags = extractHashtags(summary);
                         return hashtags.length > 0 ? (
                           <div className="hashtag-chips">
                             {hashtags.map((hashtag, index) => (
                               <span key={index} className="hashtag-chip">
                                 {hashtag}
                               </span>
                             ))}
                           </div>
                         ) : null;
                       })()}
                       
                       <div 
                         className="summary-text"
                         dangerouslySetInnerHTML={{
                           __html: convertMarkdownToHtml(summary)
                         }}
                       />
                      
                      {/* 추가 정보 */}
                      <div className="summary-footer">
                        <div>
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date().toLocaleString('ko-KR')}
                        </div>
                        <div>
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI 생성
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* 로딩 상태 */}
              {loading && summary.includes('기다리는 중') && (
                <div className="input-form">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <div className="loading-spinner"></div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: 'var(--slate-700)', fontWeight: '500' }}>AI가 영상을 분석하고 있습니다...</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>잠시만 기다려주세요</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 사이드바 */}
            <div className="sidebar">
              {/* 통계 카드 */}
              <div className="sidebar-card">
                <div className="stats-header">
                  <h3 className="sidebar-title">통계</h3>
                  {recentSummaries.length > 0 && (
                    <button 
                      className="clear-all-btn"
                      onClick={clearAllSummaries}
                      title="모든 기록 삭제"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">총 요약</span>
                    <span className="stat-value">{recentSummaries.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">성공률</span>
                    <span className="stat-value" style={{ color: 'var(--green-500)' }}>100%</span>
                  </div>
                </div>
              </div>

              {/* 최근 요약 */}
              {recentSummaries.length > 0 && (
                <div className="sidebar-card">
                  <h3 className="sidebar-title">최근 요약</h3>
                  <div className={`recent-summaries ${isRecentSummariesExpanded ? 'expanded' : 'collapsed'}`}>
                    {(isRecentSummariesExpanded ? recentSummaries : recentSummaries.slice(0, 3)).map((item, index) => (
                      <div key={index} className={`recent-item ${!isRecentSummariesExpanded && index === 2 ? 'half-visible' : ''}`}>
                        <p 
                          className="recent-url"
                          onClick={() => window.open(item.url, '_blank')}
                          title="YouTube에서 영상 보기"
                        >
                          {item.url}
                        </p>
                        <div className="recent-summary-container">
                          <p className="recent-summary">
                            {expandedSummary === index 
                              ? item.summary 
                              : `${item.summary.substring(0, 100)}${item.summary.length > 100 ? '...' : ''}`
                            }
                          </p>
                          {item.summary.length > 100 && (
                            <button 
                              className="summary-toggle-btn"
                              onClick={() => setExpandedSummary(expandedSummary === index ? null : index)}
                            >
                              {expandedSummary === index ? '접기' : '더보기'}
                            </button>
                          )}
                        </div>
                        <p className="recent-timestamp">
                          {new Date(item.timestamp).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {/* 더보기/접기 버튼 */}
                  <div className="expand-toggle-container">
                    <button 
                      className="expand-toggle-btn-bottom"
                      onClick={() => setIsRecentSummariesExpanded(!isRecentSummariesExpanded)}
                      title={isRecentSummariesExpanded ? '접기' : '전체 보기'}
                    >
                      <svg 
                        width="16" 
                        height="16" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        className={`expand-icon ${isRecentSummariesExpanded ? 'expanded' : ''}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="expand-text">
                        {isRecentSummariesExpanded ? '접기' : '더보기'}
                      </span>
                    </button>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      </main>

      {/* 플로팅 액션 버튼 */}
      <div className="floating-button">
        <div className="floating-button-container">
                    <button className="floating-button-main">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
