export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只限 POST 請求' });
  }

  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: '請提供詞語' });
  }

  // 讀取 Vercel 設定的環境變數 (隱藏 API Key)
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
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
    if (data.candidates && data.candidates.length > 0) {
      return res.status(200).json({ result: data.candidates[0].content.parts[0].text.trim() });
    } else {
      return res.status(500).json({ error: '無法生成，請換個詞語重試。' });
    }
  } catch (error) {
    return res.status(500).json({ error: '伺服器錯誤: ' + error.message });
  }
}
