// Firebase 설정 및 초기화
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, onValue, push } from "firebase/database";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAv868xkG_nlXTYlbEVD-gEbLatj80Y7DI",
  authDomain: "ws-4q-92ed5.firebaseapp.com",
  databaseURL: "https://ws-4q-92ed5-default-rtdb.firebaseio.com",
  projectId: "ws-4q-92ed5",
  storageBucket: "ws-4q-92ed5.firebasestorage.app",
  messagingSenderId: "1054164152048",
  appId: "1:1054164152048:web:1b867a795d5ba242699c35",
  measurementId: "G-67MJVKB09W"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================
// 데이터베이스 구조:
// ============================================
// /users/{userId}
//   - currentQuestion: number (현재 진행 중인 문항 번호)
//   - completed: boolean (설문 완료 여부)
//   - startedAt: timestamp (설문 시작 시간)
//   - completedAt: timestamp (설문 완료 시간)
//   - lastUpdatedAt: timestamp (마지막 업데이트 시간)
//
// /responses/{userId}/{questionId}
//   - value: string | number (응답 값)
//   - answeredAt: timestamp (응답 시간)
//
// /analysis/{questionId}
//   - result: string (AI 분석 결과)
//   - analyzedAt: timestamp (분석 시간)
//   - model: string (사용된 모델명)
// ============================================

// 사용자 관련 함수들
export const userService = {
  // 사용자 존재 여부 확인
  async checkUserExists(userId) {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists();
  },

  // 사용자 생성 또는 기존 사용자 정보 가져오기
  async getOrCreateUser(userId) {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }

    // 새 사용자 생성
    const newUser = {
      currentQuestion: 1,
      completed: false,
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    await set(userRef, newUser);
    return newUser;
  },

  // 사용자 현재 진행 상황 업데이트
  async updateProgress(userId, currentQuestion) {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      currentQuestion,
      lastUpdatedAt: Date.now(),
    });
  },

  // 설문 완료 처리
  async completesurvey(userId) {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      completed: true,
      completedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
  },

  // 사용자 정보 가져오기
  async getUser(userId) {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  },
};

// 응답 관련 함수들
export const responseService = {
  // 응답 저장
  async saveResponse(userId, questionId, value) {
    const responseRef = ref(database, `responses/${userId}/${questionId}`);
    await set(responseRef, {
      value,
      answeredAt: Date.now(),
    });
  },

  // 특정 사용자의 특정 문항 응답 가져오기
  async getResponse(userId, questionId) {
    const responseRef = ref(database, `responses/${userId}/${questionId}`);
    const snapshot = await get(responseRef);
    return snapshot.exists() ? snapshot.val() : null;
  },

  // 특정 사용자의 모든 응답 가져오기
  async getAllResponses(userId) {
    const responsesRef = ref(database, `responses/${userId}`);
    const snapshot = await get(responsesRef);
    return snapshot.exists() ? snapshot.val() : {};
  },

  // 모든 사용자의 특정 문항 응답 가져오기 (결과 집계용)
  async getQuestionResponses(questionId) {
    const responsesRef = ref(database, 'responses');
    const snapshot = await get(responsesRef);

    if (!snapshot.exists()) return [];

    const allResponses = snapshot.val();
    const questionResponses = [];

    Object.keys(allResponses).forEach(userId => {
      if (allResponses[userId][questionId]) {
        questionResponses.push({
          userId,
          ...allResponses[userId][questionId],
        });
      }
    });

    return questionResponses;
  },

  // 모든 응답 데이터 가져오기 (결과 페이지용)
  async getAllData() {
    const responsesRef = ref(database, 'responses');
    const snapshot = await get(responsesRef);
    return snapshot.exists() ? snapshot.val() : {};
  },

  // 완료된 설문 수 가져오기
  async getCompletedCount() {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return 0;

    const users = snapshot.val();
    return Object.values(users).filter(user => user.completed).length;
  },
};

// AI 분석 관련 함수들
export const analysisService = {
  // AI 분석 결과 저장
  async saveAnalysis(questionId, result, model) {
    const analysisRef = ref(database, `analysis/${questionId}`);
    await set(analysisRef, {
      result,
      analyzedAt: Date.now(),
      model,
    });
  },

  // 분석 결과 가져오기
  async getAnalysis(questionId) {
    const analysisRef = ref(database, `analysis/${questionId}`);
    const snapshot = await get(analysisRef);
    return snapshot.exists() ? snapshot.val() : null;
  },

  // 모든 분석 결과 가져오기
  async getAllAnalysis() {
    const analysisRef = ref(database, 'analysis');
    const snapshot = await get(analysisRef);
    return snapshot.exists() ? snapshot.val() : {};
  },

  // 전체 종합 분석 결과 저장
  async saveComprehensiveAnalysis(result, model) {
    console.log('[Firebase] saveComprehensiveAnalysis 시작');
    console.log('[Firebase] result 타입:', typeof result);
    console.log('[Firebase] result 길이:', result?.length);
    console.log('[Firebase] model:', model);

    // 데이터 크기 계산 (UTF-8 바이트)
    const dataSize = new Blob([JSON.stringify({ result, analyzedAt: Date.now(), model })]).size;
    console.log('[Firebase] 총 데이터 크기 (bytes):', dataSize);
    console.log('[Firebase] 총 데이터 크기 (KB):', (dataSize / 1024).toFixed(2));

    // Firebase 연결 상태 확인
    console.log('[Firebase] database 객체 존재:', !!database);

    try {
      const analysisRef = ref(database, 'comprehensiveAnalysis');
      console.log('[Firebase] ref 생성 완료');

      const dataToSave = {
        result,
        analyzedAt: Date.now(),
        model,
      };
      console.log('[Firebase] set() 호출 시작...');

      await set(analysisRef, dataToSave);
      console.log('[Firebase] set() 완료 - 저장 성공!');
    } catch (error) {
      console.error('[Firebase] set() 실패!');
      console.error('[Firebase] 에러 이름:', error.name);
      console.error('[Firebase] 에러 코드:', error.code);
      console.error('[Firebase] 에러 메시지:', error.message);
      console.error('[Firebase] 에러 전체:', error);
      throw error; // 상위로 에러 전파
    }
  },

  // 전체 종합 분석 결과 가져오기
  async getComprehensiveAnalysis() {
    const analysisRef = ref(database, 'comprehensiveAnalysis');
    const snapshot = await get(analysisRef);
    return snapshot.exists() ? snapshot.val() : null;
  },
};

// 실시간 구독 함수
export const subscribeToResponses = (callback) => {
  const responsesRef = ref(database, 'responses');
  return onValue(responsesRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
};

export { database, ref, set, get, update, onValue };
export default app;
