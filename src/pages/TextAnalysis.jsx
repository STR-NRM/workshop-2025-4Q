import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { responseService, analysisService } from '../firebase/config';
import { questions } from '../data/questions';
import { analyzeTextResponses } from '../utils/openai';
import { MODEL_CONFIG } from '../prompts/analysisPrompt';
import { Layout, Container, Card } from '../components/common/Layout';
import Button from '../components/common/Button';
import styles from './TextAnalysis.module.css';

/**
 * 서술형 분석 페이지
 * - 서술형 문항 목록 표시
 * - 문항별 AI 분석 트리거
 * - 분석 결과 페이지 링크
 */
export default function TextAnalysis() {
  const navigate = useNavigate();
  const [allResponses, setAllResponses] = useState({});
  const [analysisStatus, setAnalysisStatus] = useState({}); // { questionId: { loading, completed, error } }
  const [existingAnalyses, setExistingAnalyses] = useState({});
  const [loading, setLoading] = useState(true);

  // 서술형 문항만 필터링
  const textQuestions = questions.filter(q => q.type === 'text');

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 응답 데이터 로드
        const responses = await responseService.getAllData();
        setAllResponses(responses || {});

        // 기존 분석 결과 로드
        const analyses = {};
        for (const q of textQuestions) {
          const analysis = await analysisService.getAnalysis(q.id);
          if (analysis) {
            analyses[q.id] = analysis;
          }
        }
        setExistingAnalyses(analyses);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 문항별 응답 수집
  // 데이터 구조: responses/{userId}/{questionId} = { value, answeredAt }
  const getQuestionResponses = (questionId) => {
    const responses = [];
    Object.values(allResponses).forEach(userResponses => {
      const responseData = userResponses[questionId];
      if (responseData && responseData.value && responseData.value.trim()) {
        responses.push(responseData.value);
      }
    });
    return responses;
  };

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

      // Firebase에 저장 (questionId, result, model)
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

  // 전체 분석
  const analyzeAll = async () => {
    for (const q of textQuestions) {
      if (!existingAnalyses[q.id]) {
        await analyzeQuestion(q);
      }
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
            <h1 className={styles.title}>서술형 AI 분석</h1>
            <p className={styles.description}>
              AI를 활용하여 서술형 응답을 분석합니다.
              각 문항별로 분석을 실행하거나, 전체 분석을 한 번에 실행할 수 있습니다.
            </p>
          </header>

          {/* 전체 분석 버튼 */}
          <div className={styles.actionBar}>
            <Button
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
        </div>
      </Container>
    </Layout>
  );
}
