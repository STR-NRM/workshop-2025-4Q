import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisService } from '../firebase/config';
import { questions } from '../data/questions';
import { Layout, Container, Card } from '../components/common/Layout';
import Button from '../components/common/Button';
import styles from './ComprehensiveResult.module.css';

/**
 * 전체 종합 분석 결과 페이지
 * /result/comprehensive
 */
export default function ComprehensiveResult() {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const comprehensiveData = await analysisService.getComprehensiveAnalysis();
        if (!comprehensiveData) {
          setError('종합 분석 결과가 없습니다. AI 분석 페이지에서 먼저 분석을 실행해주세요.');
          setLoading(false);
          return;
        }
        setAnalysis(comprehensiveData);
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Container>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>종합 분석 결과를 불러오는 중...</p>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container>
          <div className={styles.error}>
            <p>{error}</p>
            <Button onClick={() => navigate('/result/text')}>
              AI 분석 페이지로
            </Button>
          </div>
        </Container>
      </Layout>
    );
  }

  // 마크다운 라인 렌더링
  const renderLine = (line, idx) => {
    if (line.startsWith('# ')) {
      return <h1 key={idx} className={styles.reportH1}>{line.substring(2)}</h1>;
    } else if (line.startsWith('## ')) {
      return <h2 key={idx} className={styles.reportH2}>{line.substring(3)}</h2>;
    } else if (line.startsWith('### ')) {
      return <h3 key={idx} className={styles.reportH3}>{line.substring(4)}</h3>;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={idx} className={styles.reportLi}>{line.substring(2)}</li>;
    } else if (line.match(/^\d+\. /)) {
      return <li key={idx} className={styles.reportLi}>{line}</li>;
    } else if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={idx} className={styles.reportBold}>{line.replace(/\*\*/g, '')}</p>;
    } else if (line.trim() === '') {
      return <br key={idx} />;
    } else {
      return <p key={idx} className={styles.reportP}>{line}</p>;
    }
  };

  return (
    <Layout>
      <Container>
        <div className={styles.content}>
          {/* 헤더 */}
          <header className={styles.header}>
            <button className={styles.backBtn} onClick={() => navigate('/result/text')}>
              ← AI 분석 페이지
            </button>
            <h1 className={styles.title}>설문 결과 종합 분석 리포트</h1>
            <p className={styles.description}>
              모든 문항(척도형, 객관식, 서술형)의 결과를 AI가 종합 분석한 리포트입니다.
            </p>
            <div className={styles.meta}>
              <span>분석 대상: {questions.length}개 문항</span>
              <span>•</span>
              <span>분석일: {new Date(analysis.analyzedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>모델: {analysis.model}</span>
            </div>
          </header>

          {/* 분석 결과 */}
          <section className={styles.analysisSection}>
            <Card className={styles.analysisCard}>
              <div className={styles.reportContent}>
                {analysis.result.split('\n').map((line, idx) => renderLine(line, idx))}
              </div>
            </Card>
          </section>

          {/* 네비게이션 */}
          <div className={styles.navigation}>
            <Button
              variant="secondary"
              onClick={() => navigate('/result/text')}
            >
              AI 분석 페이지
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
