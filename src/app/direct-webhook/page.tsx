'use client';

import { useState } from 'react';

export default function DirectWebhookPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // 방법 1: fetch() 사용
  const handleFetchWebhook = async () => {
    if (!url) return;
    setLoading(true);
    setResult('');

    try {
      const response = await fetch("https://hook.us2.make.com/8rkloj2qv61mp5kerajjqxyuqqsvb9xz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url })
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      setResult('에러가 발생했습니다: ' + err);
    }

    setLoading(false);
  };

  // 방법 2: axios 사용 (axios가 설치되어 있다면)
  const handleAxiosWebhook = async () => {
    if (!url) return;
    setLoading(true);
    setResult('');

    try {
      // axios가 설치되어 있다면 이렇게 사용할 수 있습니다
      // const response = await axios.post("https://hook.us2.make.com/8rkloj2qv61mp5kerajjqxyuqqsvb9xz", {
      //   url: url
      // });
      // setResult(JSON.stringify(response.data, null, 2));
      
      setResult('axios는 별도 설치가 필요합니다. fetch()를 사용하세요.');
    } catch (err) {
      console.error(err);
      setResult('에러가 발생했습니다: ' + err);
    }

    setLoading(false);
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔗 직접 Webhook 호출 테스트</h1>
      
      <div className="mb-4">
        <input
          className="w-full border p-2 rounded mb-4"
          type="text"
          placeholder="YouTube URL 입력"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="space-x-4 mb-6">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleFetchWebhook}
          disabled={loading}
        >
          {loading ? '호출 중...' : 'fetch()로 Webhook 호출'}
        </button>

        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={handleAxiosWebhook}
          disabled={loading}
        >
          {loading ? '호출 중...' : 'axios로 Webhook 호출'}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">응답 결과:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-semibold mb-2">📝 사용법:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>YouTube URL을 입력하세요</li>
          <li>"fetch()로 Webhook 호출" 버튼을 클릭하세요</li>
          <li>Make.com의 응답을 확인하세요</li>
          <li>axios를 사용하려면: <code>npm install axios</code></li>
        </ol>
      </div>
    </main>
  );
} 