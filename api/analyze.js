// api/analyze.js — Vercel Serverless Function
// 무료(텍스트) + 유료(텍스트+관상사진) 분석 처리

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API 키 미설정' });

  try {
    const {
      mode,
      myName, myGender, myYear, myMonth,
      myStatus, myAttach, myLoveLang, myContact, myMbti,
      partnerName, partnerGender, partnerYear, partnerMonth,
      partnerAttitude, partnerInterest, partnerMbti,
      myPhoto, myPhotoType, partnerPhoto, partnerPhotoType,
    } = req.body;

    if (!myName || !partnerName) return res.status(400).json({ error: '이름 필수' });

    // ── 무료: 텍스트 기반 궁합 분석 ──
    if (mode === 'free') {
      const prompt = `당신은 10~20대가 열광하는 연애 궁합 분석가예요.
입력된 정보를 바탕으로 두 사람의 궁합을 분석하세요.

[${myName}]
성별: ${myGender||'미입력'} / 생년월: ${myYear||'?'}년 ${myMonth||'?'}월
현재 상태: ${myStatus||'미입력'}
애착유형: ${myAttach||'미입력'}
사랑의 언어: ${myLoveLang||'미입력'}
연락 스타일: ${myContact||'미입력'}
MBTI: ${myMbti||'미입력'}

[${partnerName}]
성별: ${partnerGender||'미입력'} / 생년월: ${partnerYear||'?'}년 ${partnerMonth||'?'}월
나를 대하는 태도: ${partnerAttitude||'미입력'}
나에 대한 관심도: ${partnerInterest||'미입력'}
MBTI: ${partnerMbti||'미입력'}

작성 규칙:
- 이름을 직접 불러서 "내 얘기 같다"는 느낌을 줄 것
- 애착유형과 사랑의 언어, 현재 상태를 반드시 반영할 것
- 구체적인 상황 예시를 들어 공감을 유도할 것
- 10~20대 말투, 따뜻하고 솔직한 톤
- 한국어로 작성

순수 JSON만 응답 (마크다운 없이):
{
  "score": 숫자(58~95),
  "verdict": "궁합 제목 + 이모지",
  "oneline": "${myStatus||'두 사람의 궁합'}에 대해 한줄 요약 (이름 포함, 25자 이내)",
  "myStyle": "${myName}의 연애 스타일 (애착유형·사랑의언어 반영, 이름 직접 언급, 구체적 상황 예시, 140자)",
  "partnerStyle": "${partnerName}의 연애 스타일 (관심도·태도 반영, 이름 직접 언급, 140자)",
  "chemistry": "두 사람의 케미 (사랑의 언어 호환성 포함, 150자)",
  "blurHint": "갈등 포인트 한 줄 미리보기 (30자, 블러용 — 자세한 내용은 전체 리포트에서)"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('Anthropic 오류');
      const data = await response.json();
      let raw = data.content.map(b => b.text||'').join('').trim().replace(/```json|```/g,'').trim();
      return res.status(200).json(JSON.parse(raw));
    }

    // ── 프리미엄: 심층 + 관상 분석 ──
    if (mode === 'premium') {
      const hasPhotos = myPhoto && partnerPhoto;

      const prompt = `당신은 전통 관상학과 심리학을 결합한 프리미엄 연애 궁합 분석가예요.
두 사람의 정보${hasPhotos ? '와 얼굴 사진' : ''}를 종합해서 깊이 있는 궁합 리포트를 작성하세요.

[${myName}]
성별: ${myGender||'미입력'} / 생년월: ${myYear||'?'}년 ${myMonth||'?'}월
현재 상태: ${myStatus||'미입력'} / 애착유형: ${myAttach||'미입력'}
사랑의 언어: ${myLoveLang||'미입력'} / 연락 스타일: ${myContact||'미입력'}
MBTI: ${myMbti||'미입력'}

[${partnerName}]
성별: ${partnerGender||'미입력'} / 생년월: ${partnerYear||'?'}년 ${partnerMonth||'?'}월
나를 대하는 태도: ${partnerAttitude||'미입력'} / 관심도: ${partnerInterest||'미입력'}
MBTI: ${partnerMbti||'미입력'}

규칙:
- 이름 직접 언급, 구체적 상황 예시 포함
- 현재 상태(${myStatus||'미입력'})와 애착유형(${myAttach||'미입력'})을 반드시 반영
- 10~20대 공감 가는 말투, 따뜻하고 진심 어린 톤
- 한국어

순수 JSON만 응답:
{
  ${hasPhotos ? `"myFace": "${myName}의 관상 분석 (얼굴특징→성격→연애스타일, 160자)",
  "myFaceTraits": ["관상 특성 태그 3개"],
  "partnerFace": "${partnerName}의 관상 분석 (160자)",
  "partnerFaceTraits": ["관상 특성 태그 3개"],
  "faceChemistry": "두 얼굴의 관상학적 궁합 (170자)",` : ''}
  "conflict": "갈등 패턴과 극복 방법 (애착유형 반영, 구체적 상황 예시, 160자)",
  "longterm": "장기연애·결혼 가능성 (현재 상태 반영, 150자)",
  "monthlyFortune": "이달의 연애운 (현재 상태·이름 포함, 130자)",
  "letter": "두 분만을 위한 따뜻한 편지 (이름 직접 호명, 현재 상태 공감, 200자)"
}`;

      const content = hasPhotos
        ? [
            { type:'image', source:{ type:'base64', media_type: myPhotoType||'image/jpeg', data: myPhoto } },
            { type:'image', source:{ type:'base64', media_type: partnerPhotoType||'image/jpeg', data: partnerPhoto } },
            { type:'text', text: prompt },
          ]
        : prompt;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1800,
          messages: [{ role: 'user', content }],
        }),
      });

      if (!response.ok) throw new Error('Anthropic 오류');
      const data = await response.json();
      let raw = data.content.map(b => b.text||'').join('').trim().replace(/```json|```/g,'').trim();
      return res.status(200).json(JSON.parse(raw));
    }

    return res.status(400).json({ error: '잘못된 mode' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '서버 오류: ' + err.message });
  }
}
