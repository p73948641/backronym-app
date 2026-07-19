export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只限 POST 請求' });
  }

  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: '請提供詞語' });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  
  // 暫時用 gemini-1.5-flash 觸發測試
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

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

    if (!response.ok) {
      // 【智能診斷功能】攔截 NotFound 錯誤，自動查詢可用模型清單
      if (response.status === 404 || (data.error && data.error.message.includes("is not found"))) {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        try {
          const listRes = await fetch(listUrl);
          const listData = await listRes.json();
          
          if (listData.models) {
            const validModels = listData.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.split('/')[1]); // 抽取出正確模型名
              
            return res.status(400).json({ 
              error: `🚨 診斷成功！你條 Key 真實支援嘅模型有：${validModels.join(', ')}。請去 GitHub 將 URL 個模型名改為清單入面是但一個。` 
            });
          }
        } catch (e) {
          // 忽略診斷錯誤，直接輸出原本錯誤
        }
      }
      
      return res.status(response.status).json({ 
        error: `Google API 錯誤: ${data.error?.message || '未知名稱或權限問題'}` 
      });
    }

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
