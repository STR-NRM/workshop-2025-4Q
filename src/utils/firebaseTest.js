/**
 * Firebase 연결 테스트 유틸리티
 * 브라우저 콘솔에서 실행: import('/src/utils/firebaseTest.js').then(m => m.testFirebaseWrite())
 */
import { database, ref, set, get } from '../firebase/config';

export async function testFirebaseWrite() {
  console.log('=== Firebase 쓰기 테스트 시작 ===');

  const testData = {
    test: true,
    timestamp: Date.now(),
    message: '테스트 데이터입니다'
  };

  try {
    // 1. 테스트 경로에 쓰기
    console.log('1. 테스트 데이터 쓰기 시도...');
    const testRef = ref(database, 'test/writeTest');
    await set(testRef, testData);
    console.log('✓ 테스트 쓰기 성공!');

    // 2. comprehensiveAnalysis 경로에 쓰기
    console.log('2. comprehensiveAnalysis 경로 쓰기 시도...');
    const analysisRef = ref(database, 'comprehensiveAnalysis');
    await set(analysisRef, {
      result: '테스트 분석 결과입니다. '.repeat(100), // ~2KB 테스트
      analyzedAt: Date.now(),
      model: 'test'
    });
    console.log('✓ comprehensiveAnalysis 쓰기 성공!');

    // 3. 읽기 테스트
    console.log('3. 데이터 읽기 확인...');
    const snapshot = await get(analysisRef);
    if (snapshot.exists()) {
      console.log('✓ 읽기 성공! 저장된 데이터:', snapshot.val());
    } else {
      console.log('✗ 데이터가 존재하지 않음');
    }

    console.log('=== 테스트 완료 ===');
    return { success: true };
  } catch (error) {
    console.error('=== 테스트 실패 ===');
    console.error('에러 코드:', error.code);
    console.error('에러 메시지:', error.message);
    console.error('에러 전체:', error);

    // 에러 코드별 해결방법 안내
    if (error.code === 'PERMISSION_DENIED') {
      console.error('\n🔴 해결방법: Firebase Console → Realtime Database → Rules에서 쓰기 권한을 허용해주세요.');
      console.error('예시 Rules:');
      console.error(`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`);
    }

    return { success: false, error };
  }
}

// 큰 데이터 쓰기 테스트
export async function testLargeWrite(sizeKB = 50) {
  console.log(`=== 대용량 데이터 (${sizeKB}KB) 쓰기 테스트 ===`);

  // sizeKB 크기의 문자열 생성
  const largeText = 'A'.repeat(sizeKB * 1024);

  try {
    const testRef = ref(database, 'test/largeData');
    console.log('쓰기 시작...');
    const start = Date.now();
    await set(testRef, {
      data: largeText,
      size: largeText.length,
      timestamp: Date.now()
    });
    console.log(`✓ ${sizeKB}KB 쓰기 성공! (${Date.now() - start}ms)`);
    return { success: true };
  } catch (error) {
    console.error('✗ 대용량 쓰기 실패:', error.code, error.message);
    return { success: false, error };
  }
}

export default { testFirebaseWrite, testLargeWrite };
