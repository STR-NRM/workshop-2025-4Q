import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Container, PageWrapper } from '../components/common/Layout';
import styles from './Complete.module.css';

/**
 * 설문 완료 페이지
 * - 제출 완료 메시지
 * - 결과 페이지 링크는 별도 안내 (버튼 없음)
 */
export default function Complete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = location.state || {};

  // 사용자 정보 없으면 랜딩으로
  useEffect(() => {
    if (!userId) {
      navigate('/', { replace: true });
    }
  }, [userId, navigate]);

  if (!userId) return null;

  return (
    <Layout>
      <PageWrapper centered>
        <Container>
          <div className={styles.content}>
            {/* 체크 아이콘 */}
            <div className={styles.iconWrapper}>
              <svg
                className={styles.checkIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* 완료 메시지 */}
            <h1 className={styles.title}>설문이 완료되었습니다</h1>
            <p className={styles.description}>
              소중한 의견을 보내주셔서 감사합니다.
              <br />
              응답 내용은 팀 회고에 활용됩니다.
            </p>

            {/* 안내 */}
            <div className={styles.notice}>
              <p className={styles.noticeText}>
                설문 결과는 모든 팀원이 응답을 완료한 후
                <br />
                별도 안내되는 링크를 통해 확인하실 수 있습니다.
              </p>
            </div>

            {/* 사용자 ID 표시 */}
            <div className={styles.userId}>
              <span className={styles.userIdLabel}>참여 아이디</span>
              <span className={styles.userIdValue}>{userId}</span>
            </div>
          </div>
        </Container>
      </PageWrapper>
    </Layout>
  );
}
