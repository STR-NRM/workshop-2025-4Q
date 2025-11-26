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

  // 인라인 마크다운 파싱 (bold, italic, code)
  const parseInlineMarkdown = (text) => {
    if (!text) return text;

    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
      const boldMatch2 = remaining.match(/^(.*?)__(.+?)__/);
      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(.*?)\*([^*]+?)\*/);
      // Inline code: `code`
      const codeMatch = remaining.match(/^(.*?)`([^`]+?)`/);

      const matches = [
        boldMatch && { match: boldMatch, type: 'bold', idx: boldMatch.index + boldMatch[1].length },
        boldMatch2 && { match: boldMatch2, type: 'bold', idx: boldMatch2.index + boldMatch2[1].length },
        italicMatch && { match: italicMatch, type: 'italic', idx: italicMatch.index + italicMatch[1].length },
        codeMatch && { match: codeMatch, type: 'code', idx: codeMatch.index + codeMatch[1].length }
      ].filter(Boolean).sort((a, b) => a.idx - b.idx);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0];
      if (first.match[1]) {
        parts.push(first.match[1]);
      }

      if (first.type === 'bold') {
        parts.push(<strong key={key++}>{first.match[2]}</strong>);
        remaining = remaining.substring(first.match[0].length);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++}>{first.match[2]}</em>);
        remaining = remaining.substring(first.match[0].length);
      } else if (first.type === 'code') {
        parts.push(<code key={key++} className={styles.inlineCode}>{first.match[2]}</code>);
        remaining = remaining.substring(first.match[0].length);
      }
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
  };

  // 마크다운 테이블 파싱
  const parseTable = (lines, startIdx) => {
    const tableLines = [];
    let i = startIdx;

    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 2) return null;

    const headerCells = tableLines[0].split('|').filter(cell => cell.trim() !== '');
    const separatorLine = tableLines[1];
    if (!separatorLine.includes('-')) return null;

    const bodyRows = tableLines.slice(2).map(line =>
      line.split('|').filter(cell => cell.trim() !== '')
    );

    return {
      headers: headerCells.map(cell => cell.trim()),
      rows: bodyRows.map(row => row.map(cell => cell.trim())),
      endIdx: i
    };
  };

  // 마크다운 전체 렌더링
  const renderMarkdown = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 테이블 감지
      if (trimmed.startsWith('|')) {
        const table = parseTable(lines, i);
        if (table) {
          elements.push(
            <div key={i} className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {table.headers.map((header, hIdx) => (
                      <th key={hIdx}>{parseInlineMarkdown(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{parseInlineMarkdown(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          i = table.endIdx;
          continue;
        }
      }

      // 헤딩
      if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={i} className={styles.reportH1}>{parseInlineMarkdown(trimmed.substring(2))}</h1>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={i} className={styles.reportH2}>{parseInlineMarkdown(trimmed.substring(3))}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={i} className={styles.reportH3}>{parseInlineMarkdown(trimmed.substring(4))}</h3>);
      } else if (trimmed.startsWith('#### ')) {
        elements.push(<h4 key={i} className={styles.reportH4}>{parseInlineMarkdown(trimmed.substring(5))}</h4>);
      }
      // 구분선
      else if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={i} className={styles.divider} />);
      }
      // 리스트
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(<li key={i} className={styles.reportLi}>{parseInlineMarkdown(trimmed.substring(2))}</li>);
      } else if (trimmed.match(/^\d+\. /)) {
        const content = trimmed.replace(/^\d+\. /, '');
        elements.push(<li key={i} className={styles.reportLi}>{parseInlineMarkdown(content)}</li>);
      }
      // 빈 줄
      else if (trimmed === '') {
        elements.push(<br key={i} />);
      }
      // 일반 문단
      else {
        elements.push(<p key={i} className={styles.paragraph}>{parseInlineMarkdown(line)}</p>);
      }

      i++;
    }

    return elements;
  };

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
                {renderMarkdown(analysis.result || analysis.analysis || '')}
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
