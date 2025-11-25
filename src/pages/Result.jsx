import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { responseService } from '../firebase/config';
import { questions, scaleLabels, surveyInfo } from '../data/questions';
import { Layout, Container, Card, SectionHeader } from '../components/common/Layout';
import Button from '../components/common/Button';
import styles from './Result.module.css';

// Chart.js 등록
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

/**
 * 결과 페이지
 * - 척도형: 평균값 + 막대그래프 분포
 * - 객관식: 원그래프
 * - 서술형: 텍스트 목록 + 페이지네이션
 */
export default function Result() {
  const navigate = useNavigate();
  const [allResponses, setAllResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [textPages, setTextPages] = useState({}); // 서술형 문항별 페이지 상태

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const responses = await responseService.getAllData();
        setAllResponses(responses || {});
      } catch (err) {
        console.error('데이터 로드 실패:', err);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 문항별 응답 데이터 집계
  const aggregatedData = useMemo(() => {
    const result = {};

    questions.forEach(q => {
      const questionResponses = [];

      // 모든 사용자의 해당 문항 응답 수집
      // 데이터 구조: responses/{userId}/{questionId} = { value, answeredAt }
      Object.values(allResponses).forEach(userResponses => {
        const responseData = userResponses[q.id];
        if (responseData && responseData.value !== undefined && responseData.value !== null && responseData.value !== '') {
          questionResponses.push(responseData.value);
        }
      });

      result[q.id] = {
        question: q,
        responses: questionResponses,
        count: questionResponses.length
      };
    });

    return result;
  }, [allResponses]);

  // 척도형 통계 계산
  const getScaleStats = (responses) => {
    if (responses.length === 0) return { average: 0, distribution: [0, 0, 0, 0, 0] };

    const distribution = [0, 0, 0, 0, 0]; // 1~5점 분포
    let sum = 0;

    responses.forEach(val => {
      const num = parseInt(val);
      if (num >= 1 && num <= 5) {
        distribution[num - 1]++;
        sum += num;
      }
    });

    return {
      average: (sum / responses.length).toFixed(2),
      distribution
    };
  };

  // 객관식 통계 계산
  const getChoiceStats = (responses) => {
    const counts = { '예': 0, '아니오': 0, '모름': 0 };
    responses.forEach(val => {
      if (counts[val] !== undefined) {
        counts[val]++;
      }
    });
    return counts;
  };

  // 서술형 페이지네이션
  const ITEMS_PER_PAGE = 5;

  const getTextPage = (questionId) => textPages[questionId] || 1;

  const setTextPage = (questionId, page) => {
    setTextPages(prev => ({ ...prev, [questionId]: page }));
  };

  const getPagedResponses = (responses, questionId) => {
    const page = getTextPage(questionId);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      items: responses.slice(start, end),
      totalPages: Math.ceil(responses.length / ITEMS_PER_PAGE),
      currentPage: page
    };
  };

  // 차트 색상
  const chartColors = {
    primary: '#000000',
    secondary: '#525252',
    tertiary: '#a3a3a3',
    quaternary: '#d4d4d4',
    quinary: '#f5f5f5',
  };

  const pieColors = ['#000000', '#525252', '#a3a3a3'];

  // 섹션별 그룹핑
  const groupedQuestions = useMemo(() => {
    const groups = {};
    questions.forEach(q => {
      if (!groups[q.section]) {
        groups[q.section] = {
          sectionNumber: q.sectionNumber,
          questions: []
        };
      }
      groups[q.section].questions.push(q);
    });
    return groups;
  }, []);

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

  if (error) {
    return (
      <Layout>
        <Container>
          <div className={styles.error}>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()}>다시 시도</Button>
          </div>
        </Container>
      </Layout>
    );
  }

  const totalRespondents = Object.keys(allResponses).length;

  return (
    <Layout>
      <Container>
        <div className={styles.content}>
          {/* 헤더 */}
          <header className={styles.header}>
            <h1 className={styles.title}>설문 결과</h1>
            <p className={styles.subtitle}>{surveyInfo.title}</p>
            <div className={styles.meta}>
              <span className={styles.respondents}>총 응답자: {totalRespondents}명</span>
            </div>
          </header>

          {/* 섹션별 결과 */}
          {Object.entries(groupedQuestions).map(([sectionName, { sectionNumber, questions: sectionQuestions }]) => (
            <section key={sectionName} className={styles.section}>
              <SectionHeader
                number={sectionNumber}
                title={sectionName}
              />

              <div className={styles.questionList}>
                {sectionQuestions.map(q => {
                  const data = aggregatedData[q.id];

                  return (
                    <Card key={q.id} className={styles.questionCard}>
                      <div className={styles.questionHeader}>
                        <span className={styles.questionId}>{q.id}</span>
                        <h3 className={styles.questionTitle}>{q.title}</h3>
                        <span className={styles.responseCount}>응답 {data.count}명</span>
                      </div>
                      <p className={styles.questionText}>{q.question}</p>
                      {q.reason && (
                        <p className={styles.questionReason}>
                          <span className={styles.questionReasonLabel}>필요한 이유: </span>
                          {q.reason}
                        </p>
                      )}

                      {/* 척도형 */}
                      {q.type === 'scale' && data.count > 0 && (
                        <div className={styles.scaleResult}>
                          <div className={styles.averageDisplay}>
                            <span className={styles.averageLabel}>평균</span>
                            <span className={styles.averageValue}>
                              {getScaleStats(data.responses).average}
                            </span>
                            <span className={styles.averageMax}>/ 5.00</span>
                          </div>
                          <div className={styles.chartWrapper}>
                            <Bar
                              data={{
                                labels: scaleLabels,
                                datasets: [{
                                  label: '응답 수',
                                  data: getScaleStats(data.responses).distribution,
                                  backgroundColor: [
                                    chartColors.quinary,
                                    chartColors.quaternary,
                                    chartColors.tertiary,
                                    chartColors.secondary,
                                    chartColors.primary,
                                  ],
                                  borderWidth: 0,
                                  borderRadius: 4,
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => `${context.parsed.y}명`
                                    }
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    ticks: { stepSize: 1 },
                                    grid: { color: '#f5f5f5' }
                                  },
                                  x: {
                                    grid: { display: false }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 객관식 */}
                      {q.type === 'choice' && data.count > 0 && (
                        <div className={styles.choiceResult}>
                          <div className={styles.pieWrapper}>
                            <Pie
                              data={{
                                labels: ['예', '아니오', '모름'],
                                datasets: [{
                                  data: Object.values(getChoiceStats(data.responses)),
                                  backgroundColor: pieColors,
                                  borderWidth: 0,
                                }]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      padding: 16,
                                      usePointStyle: true,
                                      pointStyle: 'circle',
                                    }
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                        return `${context.label}: ${context.parsed}명 (${percentage}%)`;
                                      }
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                          <div className={styles.choiceStats}>
                            {Object.entries(getChoiceStats(data.responses)).map(([label, count]) => (
                              <div key={label} className={styles.choiceStat}>
                                <span className={styles.choiceLabel}>{label}</span>
                                <span className={styles.choiceCount}>{count}명</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 서술형 */}
                      {q.type === 'text' && (
                        <div className={styles.textResult}>
                          {data.count === 0 ? (
                            <p className={styles.noResponse}>응답이 없습니다.</p>
                          ) : (
                            <>
                              <ul className={styles.textList}>
                                {getPagedResponses(data.responses, q.id).items.map((response, idx) => (
                                  <li key={idx} className={styles.textItem}>
                                    <span className={styles.textIndex}>
                                      {(getTextPage(q.id) - 1) * ITEMS_PER_PAGE + idx + 1}
                                    </span>
                                    <p className={styles.textContent}>{response}</p>
                                  </li>
                                ))}
                              </ul>

                              {/* 페이지네이션 */}
                              {getPagedResponses(data.responses, q.id).totalPages > 1 && (
                                <div className={styles.pagination}>
                                  <button
                                    className={styles.pageBtn}
                                    onClick={() => setTextPage(q.id, getTextPage(q.id) - 1)}
                                    disabled={getTextPage(q.id) === 1}
                                  >
                                    이전
                                  </button>
                                  <span className={styles.pageInfo}>
                                    {getTextPage(q.id)} / {getPagedResponses(data.responses, q.id).totalPages}
                                  </span>
                                  <button
                                    className={styles.pageBtn}
                                    onClick={() => setTextPage(q.id, getTextPage(q.id) + 1)}
                                    disabled={getTextPage(q.id) === getPagedResponses(data.responses, q.id).totalPages}
                                  >
                                    다음
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* 응답 없음 */}
                      {data.count === 0 && q.type !== 'text' && (
                        <p className={styles.noResponse}>응답이 없습니다.</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}

          {/* 서술형 분석 버튼 */}
          <div className={styles.analysisSection}>
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/result/text')}
            >
              서술형 분석하기
            </Button>
          </div>
        </div>
      </Container>
    </Layout>
  );
}
