'use client';

import { useState, useEffect } from 'react';

// 캐시 무효화를 위한 강제 변경사항
const CACHE_BUSTER = 'fix-hero-section-margins-css-syntax-' + Date.now();

export default function Home() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSummaries, setRecentSummaries] = useState<Array<{url: string, summary: string, timestamp: string}>>([]);
  const [urlValid, setUrlValid] = useState(true);
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);

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
      
      if (line.startsWith('## ')) {
        // 제목 처리
        if (currentList.length > 0) {
          result.push('<ul>' + currentList.join('') + '</ul>');
          currentList = [];
        }
        const title = line.replace('## ', '');
        result.push(`<h2>${title}</h2>`);
      } else if (line.startsWith('- ')) {
        // 리스트 항목 처리
        const item = line.replace('- ', '');
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

    try {
      // 1. 요약 트리거
      const triggerRes = await fetch('/api/trigger-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const triggerData = await triggerRes.json();

      if (!triggerData.success) {
        setError(triggerData.error || '요약 요청 중 오류가 발생했습니다.');
        setLoading(false);
        return;
      }

      setSummary('요약 요청이 성공적으로 처리되었습니다. AI가 영상을 분석하고 있습니다...');

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
      
      {/* 헤더 */}


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
              YouTube AI 요약
            </h1>
            <p className="hero-description">
              🤖 AI를 사용하여 YouTube 영상을 빠르고 정확하게 요약합니다.<br />
              ✨ 복잡한 내용을 간단하고 이해하기 쉽게 만들어드립니다.
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
                        src={`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`}
                        alt="YouTube 썸네일"
                        className="thumbnail-image"
                        onError={(e) => {
                          // 고품질 썸네일이 없으면 기본 썸네일로 대체
                          e.currentTarget.src = `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`;
                        }}
                      />
                      <div className="thumbnail-overlay">
                        <div className="play-button">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
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
                                     <div className="summary-content">
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
                  <div className="recent-summaries">
                    {recentSummaries.map((item, index) => (
                      <div key={index} className="recent-item">
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
