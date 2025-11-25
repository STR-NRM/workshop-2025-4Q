import styles from './ProgressBar.module.css';

/**
 * 진행률 표시 바
 * @param {number} current - 현재 문항 번호
 * @param {number} total - 전체 문항 수
 * @param {boolean} showText - 텍스트 표시 여부
 */
export default function ProgressBar({ current, total, showText = true }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={styles.container}>
      {showText && (
        <div className={styles.textWrapper}>
          <span className={styles.current}>{current}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.total}>{total}</span>
        </div>
      )}
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={total}
        />
      </div>
      {showText && (
        <span className={styles.percentage}>{percentage}%</span>
      )}
    </div>
  );
}
