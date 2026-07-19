export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只限 POST 請求' });
  }

  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: '請提供詞語' });
  }

  // 1. 自動清除 API Key 前後可能隱藏嘅空格 (防呆設計)
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  
  // 2. 升級使用官方 v1 正式版 API，並指定最標準嘅 gemini-1.5-flash 模型
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Please create a backronym for the word "${word}". 
  Rules:
  1. The phrase must use the exact letters of "${word}" in order as the first letter of each word.
  2. The overall meaning of the generated phrase MUST be highly relevant to the original meaning of "${word}".
  3. The words must connect logically to form a coherent phrase, name, or description.
  4. Output ONLY the final English phrase, nothing else.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    const data = await response.json();

    // 3. 精準捕捉並顯示 Google API 嘅真實錯誤訊息
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Google API 錯誤: ${data.error?.message || '未知名稱或權限問題'}` 
      });
    }

    // 4. 正常輸出結果，或處理 AI 安全過濾機制
    if (data.candidates && data.candidates.length > 0) {
      return res.status(200).json({ result: data.candidates[0].content.parts[0].text.trim() });
    } else if (data.promptFeedback) {
      return res.status(400).json({ error: '觸發 AI 安全機制，請嘗試其他中性詞語。' });
    } else {
      return res.status(500).json({ error: 'API 回傳空白，請重試。' });
    }
    
  } catch (error) {
    return res.status(500).json({ error: '伺服器執行錯誤: ' + error.message });
  }
}
