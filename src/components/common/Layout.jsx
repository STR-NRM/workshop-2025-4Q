import styles from './Layout.module.css';

/**
 * 메인 레이아웃 컴포넌트
 * 모바일 최적화 (360px ~ 812px)
 */
export function Layout({ children, className = '' }) {
  return (
    <div className={`${styles.layout} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 컨테이너 컴포넌트
 * 최대 너비 제한 및 가운데 정렬
 */
export function Container({ children, className = '' }) {
  return (
    <div className={`${styles.container} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 페이지 래퍼 컴포넌트
 * 화면 전체 높이를 사용하며 콘텐츠를 가운데 정렬
 */
export function PageWrapper({ children, centered = false, className = '' }) {
  return (
    <main className={`${styles.pageWrapper} ${centered ? styles.centered : ''} ${className}`}>
      {children}
    </main>
  );
}

/**
 * 카드 컴포넌트
 * 콘텐츠를 감싸는 박스
 */
export function Card({ children, className = '' }) {
  return (
    <div className={`${styles.card} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 섹션 헤더 컴포넌트
 */
export function SectionHeader({ title, subtitle, className = '' }) {
  return (
    <header className={`${styles.sectionHeader} ${className}`}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}

export default Layout;
