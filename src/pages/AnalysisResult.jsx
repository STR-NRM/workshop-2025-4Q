import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { analysisService, responseService } from '../firebase/config';
import { questions } from '../data/questions';
import { Layout, Container, Card } from '../components/common/Layout';
import Button from '../components/common/Button';
import styles from './AnalysisResult.module.css';

/**
 * 개별 문항 AI 분석 결과 페이지
 */
export default function AnalysisResult() {
  const navigate = useNavigate();
  const { questionId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 해당 문항 정보
  const question = questions.find(q => q.id === questionId);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 분석 결과 로드
        const analysisData = await analysisService.getAnalysis(questionId);
        if (!analysisData) {
          setError('분석 결과가 없습니다. 먼저 분석을 실행해주세요.');
          setLoading(false);
          return;
        }
        setAnalysis(analysisData);

        // 원본 응답 로드
        // 데이터 구조: responses/{userId}/{questionId} = { value, answeredAt }
        const allResponses = await responseService.getAllData();
        const questionResponses = [];
        Object.values(allResponses || {}).forEach(userResponses => {
          const responseData = userResponses[questionId];
          if (responseData && responseData.value && responseData.value.trim()) {
            questionResponses.push(responseData.value);
          }
        });
        setResponses(questionResponses);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [questionId]);

  if (loading) {
    return (
      <Layout>
        <Container>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>분석 결과를 불러오는 중...</p>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error || !question) {
    return (
      <Layout>
        <Container>
          <div className={styles.error}>
            <p>{error || '문항을 찾을 수 없습니다.'}</p>
            <Button onClick={() => navigate('/result/text')}>
              목록으로 돌아가기
            </Button>
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
            <button className={styles.backBtn} onClick={() => navigate('/result/text')}>
              ← 서술형 분석 목록
            </button>
            <div className={styles.questionMeta}>
              <span className={styles.questionId}>{question.id}</span>
              {question.isOptional && (
                <span className={styles.optionalBadge}>선택</span>
              )}
            </div>
            <h1 className={styles.title}>{question.title}</h1>
            <p className={styles.questionText}>{question.question}</p>
            <div className={styles.stats}>
              <span>응답 {responses.length}개</span>
              <span>•</span>
              <span>분석일: {new Date(analysis.analyzedAt).toLocaleDateString()}</span>
            </div>
          </header>

          {/* AI 분석 결과 */}
          <section className={styles.analysisSection}>
            <h2 className={styles.sectionTitle}>AI 분석 결과</h2>
            <Card className={styles.analysisCard}>
              <div className={styles.analysisContent}>
                {(analysis.result || analysis.analysis || '').split('\n').map((paragraph, idx) => (
                  paragraph.trim() && (
                    <p key={idx} className={styles.paragraph}>
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            </Card>
          </section>

          {/* 원본 응답 */}
          <section className={styles.responsesSection}>
            <h2 className={styles.sectionTitle}>원본 응답 ({responses.length}개)</h2>
            <div className={styles.responseList}>
              {responses.map((response, idx) => (
                <Card key={idx} className={styles.responseCard}>
                  <span className={styles.responseIndex}>{idx + 1}</span>
                  <p className={styles.responseText}>{response}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* 네비게이션 */}
          <div className={styles.navigation}>
            <Button
              variant="secondary"
              onClick={() => navigate('/result/text')}
            >
              목록으로
            </Button>
            <Button
              onClick={() => navigate('/result')}
            >
              전체 결과 보기
            </Button>
          </div>
        </div>
      </Container>
    </Layout>
  );
}
