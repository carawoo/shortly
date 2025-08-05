'use client';

import { useState } from 'react';

// 캐시 무효화를 위한 강제 변경사항
const CACHE_BUSTER = 'fixed-card-width-readability-' + Date.now();

export default function Home() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSummaries, setRecentSummaries] = useState<Array<{url: string, summary: string, timestamp: string}>>([]);

  const handleSummarize = async () => {
    if (!url.trim()) {
      setError('YouTube URL을 입력해주세요.');
      return;
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
        
        // 최근 요약에 추가
        setRecentSummaries(prev => [{
          url,
          summary: summaryText,
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 4)]);
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
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-container">
              <svg className="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
                        <div>
              <h1 className="app-title">Shortly</h1>
              <p className="app-subtitle">AI YouTube 요약</p>
            </div>
          </div>
          <div className="online-status">
            <div className="status-dot"></div>
            <span className="status-text">온라인</span>
          </div>
        </div>
      </header>

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
              AI를 사용하여 YouTube 영상을 빠르고 정확하게 요약합니다. 
              복잡한 내용을 간단하고 이해하기 쉽게 만들어드립니다.
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
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="url-input"
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleSummarize} 
                  disabled={loading || !url.trim()}
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
                  <div className="summary-header">
                    <h2 className="summary-title">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      AI 요약 결과
                    </h2>
                  </div>
                                     <div className="summary-content">
                     <div 
                       className="summary-text"
                       dangerouslySetInnerHTML={{
                         __html: summary
                           .replace(/## (.*)/g, '<h2>$1</h2>')
                           .replace(/- (.*)/g, '<li>$1</li>')
                           .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                           .replace(/\n\n/g, '</p><p>')
                           .replace(/^(.)/g, '<p>$1')
                           .replace(/(.)$/g, '$1</p>')
                           .replace(/<p><h2>/g, '<h2>')
                           .replace(/<\/h2><\/p>/g, '</h2>')
                           .replace(/<p><li>/g, '<ul><li>')
                           .replace(/<\/li><\/p>/g, '</li></ul>')
                           .replace(/<\/ul><ul>/g, '')
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
                <h3 className="sidebar-title">통계</h3>
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
                        <p className="recent-url">
                          {item.url}
                        </p>
                        <p className="recent-summary">
                          {item.summary}
                        </p>
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
