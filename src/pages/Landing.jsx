import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Container, PageWrapper } from '../components/common/Layout';
import Button from '../components/common/Button';
import { surveyInfo, totalQuestions } from '../data/questions';
import { userService } from '../firebase/config';
import styles from './Landing.module.css';

/**
 * 랜딩 페이지
 * - 설문 소개
 * - 아이디 입력 (최소 4자리 영문/숫자)
 */
export default function Landing() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 아이디 유효성 검사
  const validateUserId = (id) => {
    // 영문, 숫자만 허용, 최소 4자
    const regex = /^[a-zA-Z0-9]{4,}$/;
    return regex.test(id);
  };

  // 아이디 입력 핸들러
  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\s/g, ''); // 공백 제거
    setUserId(value);
    setError('');
  };

  // 설문 시작
  const handleStart = async () => {
    // 유효성 검사
    if (!userId) {
      setError('아이디를 입력해주세요.');
      return;
    }

    if (!validateUserId(userId)) {
      setError('아이디는 영문 또는 숫자 4자리 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      // 사용자 생성 또는 기존 사용자 정보 가져오기
      const user = await userService.getOrCreateUser(userId);

      // 설문 페이지로 이동
      // 이전에 진행한 문항이 있으면 그 문항부터 시작
      navigate('/survey', {
        state: {
          userId,
          startQuestion: user.currentQuestion || 1,
          completed: user.completed || false,
        },
      });
    } catch (err) {
      console.error('Error starting survey:', err);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Enter 키로 제출
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && userId && !loading) {
      handleStart();
    }
  };

  return (
    <Layout>
      <PageWrapper centered>
        <Container>
          <div className={styles.content}>
            {/* 헤더 */}
            <header className={styles.header}>
              <div className={styles.badge}>4Q 회고</div>
              <h1 className={styles.title}>{surveyInfo.title}</h1>
              <p className={styles.description}>{surveyInfo.description}</p>
            </header>

            {/* 설문 정보 */}
            <div className={styles.info}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>대상</span>
                <span className={styles.infoValue}>스쿼드 팀원</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>문항 수</span>
                <span className={styles.infoValue}>{totalQuestions}개</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>예상 소요 시간</span>
                <span className={styles.infoValue}>약 10~15분</span>
              </div>
            </div>

            {/* 아이디 입력 */}
            <div className={styles.inputSection}>
              <label htmlFor="userId" className={styles.inputLabel}>
                아이디를 입력해주세요
              </label>
              <p className={styles.inputHint}>
                영문 또는 숫자 4자리 이상 (띄어쓰기 불가)
              </p>
              <input
                id="userId"
                type="text"
                className={styles.input}
                value={userId}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="예: user1234"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {error && <p className={styles.error}>{error}</p>}
            </div>

            {/* 시작 버튼 */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleStart}
              loading={loading}
              disabled={!userId}
            >
              설문 시작하기
            </Button>

            {/* 안내 문구 */}
            <p className={styles.notice}>
              설문은 중간에 저장되며, 같은 아이디로 접속하면 이어서 진행할 수 있습니다.
              <br />
              응답은 익명으로 수집됩니다.
            </p>
          </div>
        </Container>
      </PageWrapper>
    </Layout>
  );
}
