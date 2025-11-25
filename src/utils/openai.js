// OpenAI API 연동 유틸리티
import OpenAI from 'openai';
import { SYSTEM_PROMPT, buildUserPrompt, MODEL_CONFIG } from '../prompts/analysisPrompt';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // 내부 프로젝트용이므로 브라우저에서 직접 호출 허용
});

/**
 * 서술형 응답 분석
 * @param {Object} question - 질문 객체 (id, section, title, question, reason)
 * @param {Array} responses - 응답 배열 (문자열 배열)
 * @returns {Promise<string>} 분석 결과
 */
export async function analyzeTextResponses(question, responses) {
  const userPrompt = buildUserPrompt(question, responses);

  try {
    // Responses API 사용 (GPT-5.1)
    const response = await openai.responses.create({
      model: MODEL_CONFIG.model,
      instructions: SYSTEM_PROMPT,
      input: userPrompt,
      reasoning: MODEL_CONFIG.reasoning,
      max_output_tokens: MODEL_CONFIG.max_output_tokens,
      text: MODEL_CONFIG.text,
    });

    // 디버그: 응답 구조 확인
    console.log('OpenAI Response:', response);
    console.log('output_text:', response.output_text);
    console.log('manual path:', response.output?.[0]?.content?.[0]?.text);

    // output_text 헬퍼 또는 수동 추출
    const text = response.output_text || response.output?.[0]?.content?.[0]?.text;

    if (!text) {
      console.error('응답 텍스트 추출 실패. 응답 구조:', JSON.stringify(response, null, 2));
      throw new Error('응답 텍스트를 추출할 수 없습니다');
    }

    return text;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`AI 분석 실패: ${error.message}`);
  }
}

export default openai;
