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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎬 YouTube 영상 요약
          </h1>
          <p className="text-gray-600">
            AI를 사용하여 YouTube 영상을 빠르고 정확하게 요약합니다
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={loading}
              />
            </div>
            
            <button 
              onClick={handleSummarize} 
              disabled={loading || !url.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  요약 중...
                </span>
              ) : (
                '🎯 요약하기'
              )}
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* 요약 결과 */}
        {summary && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                요약 결과
              </h2>
            </div>
            <div className="p-6">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
              
              {/* 추가 정보 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {new Date().toLocaleString('ko-KR')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading && summary.includes('기다리는 중') && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 font-medium">요약 결과를 기다리는 중...</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
