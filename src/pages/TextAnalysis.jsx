import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { responseService, analysisService } from '../firebase/config';
import { questions } from '../data/questions';
import { analyzeTextResponses, analyzeComprehensive } from '../utils/openai';
import { MODEL_CONFIG } from '../prompts/analysisPrompt';
import { COMPREHENSIVE_MODEL_CONFIG } from '../prompts/comprehensiveAnalysisPrompt';
import { Layout, Container, Card, SectionHeader } from '../components/common/Layout';
import Button from '../components/common/Button';
import styles from './TextAnalysis.module.css';

/**
 * AI 분석 페이지
 * - 서술형 문항 목록 및 AI 분석
 * - 전체 설문 결과 종합 분석
 */
export default function TextAnalysis() {
  const navigate = useNavigate();
  const [allResponses, setAllResponses] = useState({});
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [existingAnalyses, setExistingAnalyses] = useState({});
  const [loading, setLoading] = useState(true);

  // 전체 분석 상태
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState(null);
  const [comprehensiveStatus, setComprehensiveStatus] = useState({
    loading: false,
    error: null
  });

  // 서술형 문항만 필터링
  const textQuestions = questions.filter(q => q.type === 'text');

  // 총 응답자 수
  const totalRespondents = Object.keys(allResponses).length;

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 응답 데이터 로드
        const responses = await responseService.getAllData();
        setAllResponses(responses || {});

        // 기존 서술형 분석 결과 로드
        const analyses = {};
        for (const q of textQuestions) {
          const analysis = await analysisService.getAnalysis(q.id);
          if (analysis) {
            analyses[q.id] = analysis;
          }
        }
        setExistingAnalyses(analyses);

        // 기존 전체 분석 결과 로드
        const comprehensive = await analysisService.getComprehensiveAnalysis();
        if (comprehensive) {
          setComprehensiveAnalysis(comprehensive);
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 문항별 응답 수집 (텍스트)
  const getQuestionResponses = (questionId) => {
    const responses = [];
    Object.values(allResponses).forEach(userResponses => {
      const responseData = userResponses[questionId];
      if (responseData && responseData.value && String(responseData.value).trim()) {
        responses.push(responseData.value);
      }
    });
    return responses;
  };

  // 전체 문항 집계 데이터 생성
  const aggregatedData = useMemo(() => {
    const result = {};

    questions.forEach(q => {
      const questionResponses = [];

      Object.values(allResponses).forEach(userResponses => {
        const responseData = userResponses[q.id];
        if (responseData && responseData.value !== undefined && responseData.value !== null && responseData.value !== '') {
          questionResponses.push(responseData.value);
        }
      });

      const data = {
        question: q,
        responses: questionResponses,
        count: questionResponses.length,
        stats: null
      };

      // 타입별 통계 계산
      if (q.type === 'scale' && questionResponses.length > 0) {
        const distribution = [0, 0, 0, 0, 0];
        let sum = 0;
        questionResponses.forEach(val => {
          const num = parseInt(val);
          if (num >= 1 && num <= 5) {
            distribution[num - 1]++;
            sum += num;
          }
        });
        data.stats = {
          average: (sum / questionResponses.length).toFixed(2),
          distribution
        };
      } else if (q.type === 'choice' && questionResponses.length > 0) {
        const counts = { '예': 0, '아니오': 0, '모름': 0 };
        questionResponses.forEach(val => {
          if (counts[val] !== undefined) {
            counts[val]++;
          }
        });
        data.stats = counts;
      }

      result[q.id] = data;
    });

    return result;
  }, [allResponses]);

  // 단일 문항 분석
  const analyzeQuestion = async (question) => {
    const responses = getQuestionResponses(question.id);

    if (responses.length === 0) {
      setAnalysisStatus(prev => ({
        ...prev,
        [question.id]: { loading: false, completed: false, error: '분석할 응답이 없습니다.' }
      }));
      return;
    }

    setAnalysisStatus(prev => ({
      ...prev,
      [question.id]: { loading: true, completed: false, error: null }
    }));

    try {
      const result = await analyzeTextResponses(question, responses);
      await analysisService.saveAnalysis(question.id, result, MODEL_CONFIG.model);

      setExistingAnalyses(prev => ({
        ...prev,
        [question.id]: { analysis: result, analyzedAt: new Date().toISOString() }
      }));

      setAnalysisStatus(prev => ({
        ...prev,
        [question.id]: { loading: false, completed: true, error: null }
      }));
    } catch (err) {
      console.error('분석 실패:', err);
      setAnalysisStatus(prev => ({
        ...prev,
        [question.id]: { loading: false, completed: false, error: '분석에 실패했습니다.' }
      }));
    }
  };

  // 서술형 전체 분석
  const analyzeAll = async () => {
    for (const q of textQuestions) {
      if (!existingAnalyses[q.id]) {
        await analyzeQuestion(q);
      }
    }
  };

  // 전체 종합 분석 실행
  const runComprehensiveAnalysis = async () => {
    setComprehensiveStatus({ loading: true, error: null });

    try {
      const surveyData = {
        questions,
        aggregatedData,
        totalRespondents
      };

      // Step 1: OpenAI API 호출 및 텍스트 추출
      console.log('=== Step 1: OpenAI API 호출 ===');
      const result = await analyzeComprehensive(surveyData);
      console.log('=== Step 1 완료: 텍스트 추출 성공 ===');
      console.log('추출된 텍스트 길이:', result?.length);
      console.log('추출된 텍스트 타입:', typeof result);

      // Step 2: Firebase 저장
      console.log('=== Step 2: Firebase 저장 시작 ===');
      console.log('저장할 데이터 크기 (bytes):', new Blob([result]).size);

      try {
        await analysisService.saveComprehensiveAnalysis(result, COMPREHENSIVE_MODEL_CONFIG.model);
        console.log('=== Step 2 완료: Firebase 저장 성공 ===');
      } catch (firebaseError) {
        console.error('=== Step 2 실패: Firebase 저장 에러 ===');
        console.error('Firebase 에러 타입:', firebaseError.constructor.name);
        console.error('Firebase 에러 코드:', firebaseError.code);
        console.error('Firebase 에러 메시지:', firebaseError.message);
        console.error('Firebase 에러 전체:', firebaseError);

        // Firebase 저장 실패해도 UI에는 결과 표시 (로컬만)
        console.log('Firebase 저장 실패했지만 로컬 상태는 업데이트합니다.');
        setComprehensiveAnalysis({
          result,
          analyzedAt: Date.now(),
          model: COMPREHENSIVE_MODEL_CONFIG.model
        });
        setComprehensiveStatus({ loading: false, error: 'Firebase 저장 실패 (결과는 화면에 표시됨)' });
        return;
      }

      // Step 3: 상태 업데이트 및 결과 페이지로 이동
      console.log('=== Step 3: 상태 업데이트 ===');
      setComprehensiveAnalysis({
        result,
        analyzedAt: Date.now(),
        model: COMPREHENSIVE_MODEL_CONFIG.model
      });

      setComprehensiveStatus({ loading: false, error: null });
      console.log('=== 전체 분석 완료 - 결과 페이지로 이동 ===');
      navigate('/result/comprehensive');
    } catch (err) {
      console.error('=== 전체 분석 실패 ===');
      console.error('에러 발생 단계: OpenAI API 또는 텍스트 추출');
      console.error('에러 타입:', err.constructor.name);
      console.error('에러 메시지:', err.message);
      console.error('에러 스택:', err.stack);
      setComprehensiveStatus({ loading: false, error: `분석 실패: ${err.message}` });
    }
  };

  // 분석 완료 여부
  const isAnalyzed = (questionId) => {
    return !!existingAnalyses[questionId];
  };

  if (loading) {
    return (
      <Layout>
        <Container>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>데이터를 불러오는 중...</p>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container>
        <div className={styles.content}>
          {/* 헤더 */}
          <header className={styles.header}>
            <button className={styles.backBtn} onClick={() => navigate('/result')}>
              ← 결과 페이지로
            </button>
            <h1 className={styles.title}>AI 분석</h1>
            <p className={styles.description}>
              AI를 활용하여 설문 응답을 분석합니다.
              서술형 문항 개별 분석 또는 전체 설문 종합 분석을 실행할 수 있습니다.
            </p>
          </header>

          {/* ========== 전체 AI 분석 섹션 ========== */}
          <section className={styles.section}>
            <SectionHeader number="1" title="전체 AI 분석" />
            <Card className={styles.comprehensiveCard}>
              <div className={styles.comprehensiveInfo}>
                <h3 className={styles.comprehensiveTitle}>설문 결과 종합 분석 리포트</h3>
                <p className={styles.comprehensiveDesc}>
                  모든 문항(척도형, 객관식, 서술형)의 결과를 종합하여 AI가 심층 분석합니다.
                  문항 간 상관관계, 팀의 강점과 개선점, 구체적 제안사항을 포함한 1페이지 리포트를 생성합니다.
                </p>
                <div className={styles.comprehensiveMeta}>
                  <span>총 응답자: {totalRespondents}명</span>
                  <span>분석 대상: {questions.length}개 문항</span>
                </div>
              </div>

              <div className={styles.comprehensiveActions}>
                {comprehensiveStatus.loading ? (
                  <div className={styles.analyzing}>
                    <div className={styles.miniSpinner} />
                    <span>종합 분석 중... (약 1-2분 소요)</span>
                  </div>
                ) : comprehensiveStatus.error ? (
                  <div className={styles.errorMsg}>{comprehensiveStatus.error}</div>
                ) : (
                  <>
                    <Button
                      variant={comprehensiveAnalysis ? 'secondary' : 'primary'}
                      onClick={runComprehensiveAnalysis}
                      disabled={totalRespondents === 0}
                    >
                      {comprehensiveAnalysis ? '재분석 실행' : '전체 결과 분석'}
                    </Button>
                    {comprehensiveAnalysis && (
                      <Button
                        onClick={() => navigate('/result/comprehensive')}
                      >
                        결과 보기
                      </Button>
                    )}
                  </>
                )}

                {comprehensiveAnalysis && (
                  <span className={styles.analyzedBadge}>
                    분석 완료 ({new Date(comprehensiveAnalysis.analyzedAt).toLocaleDateString()})
                  </span>
                )}
              </div>
            </Card>
          </section>

          {/* ========== 서술형 AI 분석 섹션 ========== */}
          <section className={styles.section}>
            <SectionHeader number="2" title="서술형 AI 분석" />

            {/* 전체 분석 버튼 */}
            <div className={styles.actionBar}>
              <Button
                variant="secondary"
                onClick={analyzeAll}
                disabled={Object.values(analysisStatus).some(s => s.loading)}
              >
                미분석 문항 전체 분석
              </Button>
              <span className={styles.analysisCount}>
                분석 완료: {Object.keys(existingAnalyses).length} / {textQuestions.length}
              </span>
            </div>

            {/* 문항 목록 */}
            <div className={styles.questionList}>
              {textQuestions.map(q => {
                const responses = getQuestionResponses(q.id);
                const status = analysisStatus[q.id] || {};
                const analyzed = isAnalyzed(q.id);

                return (
                  <Card key={q.id} className={styles.questionCard}>
                    <div className={styles.questionInfo}>
                      <div className={styles.questionHeader}>
                        <span className={styles.questionId}>{q.id}</span>
                        <h3 className={styles.questionTitle}>{q.title}</h3>
                        {q.isOptional && (
                          <span className={styles.optionalBadge}>선택</span>
                        )}
                      </div>
                      <p className={styles.questionText}>{q.question}</p>
                      <div className={styles.meta}>
                        <span className={styles.responseCount}>응답 {responses.length}개</span>
                        {analyzed && (
                          <span className={styles.analyzedBadge}>
                            분석 완료 ({new Date(existingAnalyses[q.id].analyzedAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.actions}>
                      {status.loading ? (
                        <div className={styles.analyzing}>
                          <div className={styles.miniSpinner} />
                          <span>분석 중...</span>
                        </div>
                      ) : status.error ? (
                        <div className={styles.errorMsg}>{status.error}</div>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => analyzeQuestion(q)}
                            disabled={responses.length === 0}
                          >
                            {analyzed ? '재분석' : '분석하기'}
                          </Button>
                          {analyzed && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/result/text/${q.id}`)}
                            >
                              결과 보기
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </Container>
    </Layout>
  );
}
