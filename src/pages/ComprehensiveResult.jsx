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

    // 테이블 라인 수집
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 2) return null;

    // 헤더 파싱
    const headerCells = tableLines[0].split('|').filter(cell => cell.trim() !== '');

    // 구분선 확인 (두 번째 줄)
    const separatorLine = tableLines[1];
    if (!separatorLine.includes('-')) return null;

    // 바디 파싱
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
        elements.push(<p key={i} className={styles.reportP}>{parseInlineMarkdown(line)}</p>);
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
                {renderMarkdown(analysis.result)}
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
