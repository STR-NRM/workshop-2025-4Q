import { useState, useEffect } from 'react';
import styles from './ScaleQuestion.module.css';
import { scaleLabelsMap } from '../../data/questions';

/**
 * 5점 리커트 척도 질문 컴포넌트
 * 선택하면 자동으로 다음 문항으로 이동
 */
export default function ScaleQuestion({
  question,
  value,
  onChange,
  onAutoNext,
}) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleSelect = (scaleValue) => {
    setSelected(scaleValue);
    onChange(scaleValue);

    // 선택 후 짧은 딜레이 후 자동 다음 이동
    if (onAutoNext) {
      setTimeout(() => {
        onAutoNext();
      }, 300);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.questionInfo}>
        <span className={styles.section}>{question.section}</span>
        <h2 className={styles.title}>{question.title}</h2>
        <p className={styles.questionText}>{question.question}</p>
      </div>

      <div className={styles.scaleContainer}>
        <div className={styles.scaleLabels}>
          <span className={styles.labelLeft}>전혀 그렇지 않다</span>
          <span className={styles.labelRight}>매우 그렇다</span>
        </div>

        <div className={styles.scaleButtons}>
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              className={`${styles.scaleButton} ${selected === num ? styles.selected : ''}`}
              onClick={() => handleSelect(num)}
              aria-label={`${num}점: ${scaleLabelsMap[num]}`}
            >
              <span className={styles.number}>{num}</span>
            </button>
          ))}
        </div>

        <div className={styles.scaleDescriptions}>
          {[1, 2, 3, 4, 5].map((num) => (
            <span key={num} className={styles.description}>
              {scaleLabelsMap[num]}
            </span>
          ))}
        </div>
      </div>

      {question.isOptional && (
        <p className={styles.optionalNote}>
          * 선택 문항입니다. 해당되지 않으면 건너뛸 수 있습니다.
        </p>
      )}
    </div>
  );
}
