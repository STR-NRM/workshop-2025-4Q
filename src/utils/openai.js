// OpenAI API 연동 유틸리티
import OpenAI from 'openai';
import { SYSTEM_PROMPT, buildUserPrompt, MODEL_CONFIG } from '../prompts/analysisPrompt';
import {
  COMPREHENSIVE_SYSTEM_PROMPT,
  buildComprehensivePrompt,
  COMPREHENSIVE_MODEL_CONFIG
} from '../prompts/comprehensiveAnalysisPrompt';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // 내부 프로젝트용이므로 브라우저에서 직접 호출 허용
});

/**
 * OpenAI Responses API 응답에서 텍스트 추출
 * reasoning 모델 사용 시 output[0]은 reasoning 블록, output[1]이 message 블록임
 * @param {Object} response - OpenAI API 응답 객체
 * @returns {string|null} 추출된 텍스트 또는 null
 */
function extractTextFromResponse(response) {
  console.log('=== extractTextFromResponse 시작 ===');
  console.log('response 타입:', typeof response);
  console.log('response null 체크:', response === null, response === undefined);

  try {
    // 디버그: 전체 구조 탐색
    if (response) {
      console.log('response 키:', Object.keys(response));
      console.log('response.output 존재:', 'output' in response);
      console.log('response.output_text 존재:', 'output_text' in response);

      if (response.output_text) {
        console.log('response.output_text 타입:', typeof response.output_text);
        console.log('response.output_text 길이:', response.output_text?.length);
      }

      if (response.output) {
        console.log('response.output 타입:', typeof response.output);
        console.log('response.output Array.isArray:', Array.isArray(response.output));
        console.log('response.output 길이:', response.output?.length);

        if (Array.isArray(response.output)) {
          response.output.forEach((item, idx) => {
            console.log(`output[${idx}] 타입:`, item?.type);
            console.log(`output[${idx}] 키:`, item ? Object.keys(item) : 'null');
            if (item?.content) {
              console.log(`output[${idx}].content Array.isArray:`, Array.isArray(item.content));
              console.log(`output[${idx}].content 길이:`, item.content?.length);
              if (Array.isArray(item.content) && item.content[0]) {
                console.log(`output[${idx}].content[0] 키:`, Object.keys(item.content[0]));
                console.log(`output[${idx}].content[0].text 존재:`, 'text' in item.content[0]);
                console.log(`output[${idx}].content[0].text 타입:`, typeof item.content[0].text);
                if (item.content[0].text) {
                  console.log(`output[${idx}].content[0].text 길이:`, item.content[0].text.length);
                  console.log(`output[${idx}].content[0].text 처음 100자:`, item.content[0].text.substring(0, 100));
                }
              }
            }
          });
        }
      }
    }

    // 1. SDK output_text 헬퍼 (가장 안정적)
    if (response?.output_text && typeof response.output_text === 'string') {
      console.log('✓ 추출 성공: output_text 헬퍼 사용');
      return response.output_text;
    }

    // 2. 직접 경로 (reasoning 모델: output[1]이 message)
    const directText = response?.output?.[1]?.content?.[0]?.text;
    if (directText && typeof directText === 'string') {
      console.log('✓ 추출 성공: output[1].content[0].text');
      return directText;
    }

    // 3. output[0] 시도 (reasoning 없는 경우)
    const fallbackText = response?.output?.[0]?.content?.[0]?.text;
    if (fallbackText && typeof fallbackText === 'string') {
      console.log('✓ 추출 성공: output[0].content[0].text');
      return fallbackText;
    }

    // 4. message 타입 검색 (모든 output 항목 순회)
    const output = response?.output;
    if (Array.isArray(output)) {
      for (let i = 0; i < output.length; i++) {
        const item = output[i];
        if (item?.type === 'message' && Array.isArray(item?.content)) {
          for (let j = 0; j < item.content.length; j++) {
            const c = item.content[j];
            if (c?.text && typeof c.text === 'string') {
              console.log(`✓ 추출 성공: output[${i}].content[${j}].text (message 타입 검색)`);
              return c.text;
            }
          }
        }
      }
    }

    // 5. 마지막 시도: 모든 output 항목에서 content.text 찾기
    if (Array.isArray(output)) {
      for (let i = 0; i < output.length; i++) {
        const item = output[i];
        if (Array.isArray(item?.content)) {
          for (let j = 0; j < item.content.length; j++) {
            const c = item.content[j];
            if (c?.text && typeof c.text === 'string' && c.text.length > 100) {
              console.log(`✓ 추출 성공: output[${i}].content[${j}].text (전체 검색, 타입=${item?.type})`);
              return c.text;
            }
          }
        }
      }
    }

    console.error('✗ 모든 추출 방법 실패');
    console.error('최종 response 구조:', JSON.stringify(response, null, 2).substring(0, 2000));
    return null;
  } catch (err) {
    console.error('✗ 추출 중 예외 발생:', err);
    console.error('예외 스택:', err.stack);
    return null;
  }
}

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

    // 텍스트 추출 (reasoning 모델 대응)
    const text = extractTextFromResponse(response);

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

/**
 * 전체 설문 결과 종합 분석
 * @param {Object} surveyData - 전체 설문 데이터
 * @param {Array} surveyData.questions - 모든 질문 배열
 * @param {Object} surveyData.aggregatedData - 집계된 응답 데이터
 * @param {number} surveyData.totalRespondents - 총 응답자 수
 * @returns {Promise<string>} 종합 분석 리포트
 */
export async function analyzeComprehensive(surveyData) {
  const userPrompt = buildComprehensivePrompt(surveyData);

  try {
    console.log('=== 전체 분석 시작 ===');
    console.log('프롬프트 길이:', userPrompt.length);
    console.log('모델:', COMPREHENSIVE_MODEL_CONFIG.model);
    console.log('max_output_tokens:', COMPREHENSIVE_MODEL_CONFIG.max_output_tokens);

    console.log('OpenAI API 호출 중...');
    const response = await openai.responses.create({
      model: COMPREHENSIVE_MODEL_CONFIG.model,
      instructions: COMPREHENSIVE_SYSTEM_PROMPT,
      input: userPrompt,
      reasoning: COMPREHENSIVE_MODEL_CONFIG.reasoning,
      max_output_tokens: COMPREHENSIVE_MODEL_CONFIG.max_output_tokens,
      text: COMPREHENSIVE_MODEL_CONFIG.text,
    });

    console.log('=== OpenAI API 응답 수신 완료 ===');
    console.log('response 존재:', !!response);
    console.log('response.id:', response?.id);
    console.log('response.status:', response?.status);

    // 텍스트 추출 (reasoning 모델 대응)
    console.log('텍스트 추출 시작...');
    const text = extractTextFromResponse(response);

    if (!text) {
      console.error('=== 텍스트 추출 실패 ===');
      // 응답 구조 일부만 출력 (너무 길면 콘솔이 느려짐)
      const debugInfo = {
        id: response?.id,
        status: response?.status,
        hasOutput: !!response?.output,
        outputLength: response?.output?.length,
        hasOutputText: !!response?.output_text,
        outputTextLength: response?.output_text?.length,
      };
      console.error('디버그 정보:', debugInfo);
      throw new Error('응답 텍스트를 추출할 수 없습니다');
    }

    console.log('=== 텍스트 추출 성공 ===');
    console.log('추출된 텍스트 길이:', text.length);
    console.log('추출된 텍스트 처음 200자:', text.substring(0, 200));

    return text;
  } catch (error) {
    console.error('=== 전체 분석 에러 발생 ===');
    console.error('에러 타입:', error.constructor.name);
    console.error('에러 메시지:', error.message);
    console.error('에러 스택:', error.stack);
    throw new Error(`전체 분석 실패: ${error.message}`);
  }
}

export default openai;
