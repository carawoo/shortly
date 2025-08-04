'use client';

import { useState } from 'react';

export default function SummarizePage() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!url) return;
    setLoading(true);
    setSummary('');

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (data.result) {
        setSummary(data.result); // result는 Make에서 받은 요약 텍스트
      } else {
        setSummary('요약 결과가 없습니다.');
      }
    } catch (err) {
      console.error(err);
      setSummary('에러가 발생했습니다.');
    }

    setLoading(false);
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎬 YouTube 요약기</h1>
      <input
        className="w-full border p-2 rounded mb-4"
        type="text"
        placeholder="YouTube URL 입력"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        className="bg-black text-white px-4 py-2 rounded"
        onClick={handleSummarize}
        disabled={loading}
      >
        {loading ? '요약 중...' : '요약하기'}
      </button>

      {summary && (
        <div className="mt-6 p-4 bg-gray-100 rounded whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </main>
  );
} 