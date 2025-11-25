import { forwardRef } from 'react';
import styles from './Button.module.css';

/**
 * Button 컴포넌트
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost'} variant - 버튼 스타일
 * @param {'sm' | 'md' | 'lg'} size - 버튼 크기
 * @param {boolean} fullWidth - 전체 너비 사용
 * @param {boolean} disabled - 비활성화 상태
 * @param {boolean} loading - 로딩 상태
 * @param {React.ReactNode} children - 버튼 내용
 */
const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  className = '',
  ...props
}, ref) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : null}
      <span className={loading ? styles.hiddenText : ''}>
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
