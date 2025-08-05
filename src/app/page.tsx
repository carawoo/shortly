'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      
      <main className="relative z-10 min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
              YouTube AI 요약
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              AI를 사용하여 YouTube 영상을 빠르고 정확하게 요약합니다. 
              복잡한 내용을 간단하고 이해하기 쉽게 만들어드립니다.
            </p>
          </div>

          {/* 입력 폼 */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/20 dark:border-slate-700/50">
            <div className="space-y-6">
              <div>
                <label htmlFor="url" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  YouTube URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-blue-400/20 dark:focus:border-blue-400 transition-all duration-200 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleSummarize} 
                disabled={loading || !url.trim()}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    AI가 분석 중입니다...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    요약 시작하기
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8 backdrop-blur-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 요약 결과 */}
          {summary && (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
              <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 px-8 py-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  AI 요약 결과
                </h2>
              </div>
              <div className="p-8">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                    {summary}
                  </p>
                </div>
                
                {/* 추가 정보 */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date().toLocaleString('ko-KR')}
                    </div>
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mt-8 border border-white/20 dark:border-slate-700/50">
              <div className="flex items-center justify-center space-x-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                </div>
                <div className="text-center">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">AI가 영상을 분석하고 있습니다...</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">잠시만 기다려주세요</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
