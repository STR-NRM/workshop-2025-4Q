import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Container, PageWrapper } from '../components/common/Layout';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';
import ScaleQuestion from '../components/survey/ScaleQuestion';
import ChoiceQuestion from '../components/survey/ChoiceQuestion';
import TextQuestion from '../components/survey/TextQuestion';
import { questions, totalQuestions } from '../data/questions';
import { userService, responseService } from '../firebase/config';
import styles from './Survey.module.css';

/**
 * 설문 페이지
 * - 1페이지 1문항
 * - 자동 저장
 * - 척도/객관식은 선택 시 자동 다음 이동
 * - 서술형은 다음/이전 버튼으로 이동
 */
export default function Survey() {
  const navigate = useNavigate();
  const location = useLocation();

  // 상태에서 사용자 정보 가져오기
  const { userId, startQuestion, completed } = location.state || {};

  // 로그인 안 된 경우 랜딩으로 리다이렉트
  useEffect(() => {
    if (!userId) {
      navigate('/', { replace: true });
    } else if (completed) {
      navigate('/complete', { state: { userId }, replace: true });
    }
  }, [userId, completed, navigate]);

  const [currentIndex, setCurrentIndex] = useState((startQuestion || 1) - 1);
  const [responses, setResponses] = useState({});
  const [textDraft, setTextDraft] = useState(''); // 서술형 임시 저장용
  const [saving, setSaving] = useState(false);

  // 현재 문항
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isFirstQuestion = currentIndex === 0;

  // 문항 변경 시 textDraft 초기화
  useEffect(() => {
    if (currentQuestion?.type === 'text') {
      setTextDraft(responses[currentQuestion.id] || '');
    }
  }, [currentIndex, currentQuestion?.id, currentQuestion?.type]);

  // 기존 응답 로드
  useEffect(() => {
    const loadResponses = async () => {
      if (!userId) return;

      try {
        const savedResponses = await responseService.getAllResponses(userId);
        if (savedResponses) {
          // 응답 데이터 변환
          const formattedResponses = {};
          Object.keys(savedResponses).forEach(questionId => {
            formattedResponses[questionId] = savedResponses[questionId].value;
          });
          setResponses(formattedResponses);
        }
      } catch (err) {
        console.error('Error loading responses:', err);
      }
    };

    loadResponses();
  }, [userId]);

  // 응답 저장 함수
  const saveResponse = useCallback(async (questionId, value) => {
    if (!userId) return;

    setSaving(true);
    try {
      await responseService.saveResponse(userId, questionId, value);
      setResponses(prev => ({
        ...prev,
        [questionId]: value,
      }));
    } catch (err) {
      console.error('Error saving response:', err);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // 진행 상황 저장
  const saveProgress = useCallback(async (questionNumber) => {
    if (!userId) return;

    try {
      await userService.updateProgress(userId, questionNumber);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [userId]);

  // 응답 변경 핸들러
  const handleResponseChange = (value) => {
    if (!currentQuestion) return;

    // 서술형은 로컬 상태만 업데이트 (다음/이전 이동 시 저장)
    if (currentQuestion.type === 'text') {
      setTextDraft(value);
      setResponses(prev => ({
        ...prev,
        [currentQuestion.id]: value,
      }));
    } else {
      // 척도형/객관식은 즉시 저장
      saveResponse(currentQuestion.id, value);
    }
  };

  // 서술형 응답 저장 (페이지 이동 시 호출)
  const saveTextDraftIfNeeded = useCallback(async () => {
    if (currentQuestion?.type === 'text' && textDraft !== undefined && textDraft !== '') {
      await saveResponse(currentQuestion.id, textDraft);
    }
  }, [currentQuestion, textDraft, saveResponse]);

  // 다음 문항으로 이동
  const goToNext = useCallback(async () => {
    if (currentIndex < totalQuestions - 1) {
      // 서술형이면 먼저 저장
      await saveTextDraftIfNeeded();

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTextDraft(''); // 드래프트 초기화
      saveProgress(nextIndex + 1);
    }
  }, [currentIndex, saveProgress, saveTextDraftIfNeeded]);

  // 이전 문항으로 이동
  const goToPrev = async () => {
    if (currentIndex > 0) {
      // 서술형이면 먼저 저장
      await saveTextDraftIfNeeded();

      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setTextDraft(''); // 드래프트 초기화
      saveProgress(prevIndex + 1);
    }
  };

  // 최종 제출
  const handleSubmit = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      // 서술형이면 먼저 저장
      await saveTextDraftIfNeeded();

      await userService.completesurvey(userId);
      navigate('/complete', { state: { userId } });
    } catch (err) {
      console.error('Error submitting survey:', err);
      alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // 자동 다음 이동 (척도/객관식용)
  const handleAutoNext = useCallback(() => {
    if (!isLastQuestion) {
      goToNext();
    }
  }, [isLastQuestion, goToNext]);

  // 현재 응답값
  const currentValue = currentQuestion ? responses[currentQuestion.id] : undefined;

  // 문항 타입에 따른 컴포넌트 렌더링
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'scale':
        return (
          <ScaleQuestion
            question={currentQuestion}
            value={currentValue}
            onChange={handleResponseChange}
            onAutoNext={handleAutoNext}
          />
        );
      case 'choice':
        return (
          <ChoiceQuestion
            question={currentQuestion}
            value={currentValue}
            onChange={handleResponseChange}
            onAutoNext={handleAutoNext}
          />
        );
      case 'text':
        return (
          <TextQuestion
            question={currentQuestion}
            value={currentValue}
            onChange={handleResponseChange}
          />
        );
      default:
        return null;
    }
  };

  if (!userId) return null;

  return (
    <Layout>
      <PageWrapper>
        <Container>
          <div className={styles.surveyContainer}>
            {/* 상단 진행률 */}
            <header className={styles.header}>
              <ProgressBar
                current={currentIndex + 1}
                total={totalQuestions}
              />
              {saving && <span className={styles.savingIndicator}>저장 중...</span>}
            </header>

            {/* 문항 영역 */}
            <main className={styles.questionArea}>
              {renderQuestion()}
            </main>

            {/* 하단 네비게이션 */}
            <footer className={styles.navigation}>
              <Button
                variant="ghost"
                onClick={goToPrev}
                disabled={isFirstQuestion || saving}
              >
                이전
              </Button>

              {isLastQuestion ? (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={saving}
                  disabled={!currentValue && currentQuestion?.required}
                >
                  최종 제출
                </Button>
              ) : (
                <Button
                  variant={currentQuestion?.type === 'text' ? 'primary' : 'secondary'}
                  onClick={goToNext}
                  disabled={saving || (!currentValue && currentQuestion?.required)}
                >
                  {currentQuestion?.isOptional ? '건너뛰기' : '다음'}
                </Button>
              )}
            </footer>
          </div>
        </Container>
      </PageWrapper>
    </Layout>
  );
}
