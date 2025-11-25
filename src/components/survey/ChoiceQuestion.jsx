import { useState, useEffect } from 'react';
import styles from './ChoiceQuestion.module.css';

/**
 * 객관식 (예/아니오/모름) 질문 컴포넌트
 * 선택하면 자동으로 다음 문항으로 이동
 */
export default function ChoiceQuestion({
  question,
  value,
  onChange,
  onAutoNext,
}) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleSelect = (optionValue) => {
    setSelected(optionValue);
    onChange(optionValue);

    // 선택 후 짧은 딜레이 후 자동 다음 이동
    if (onAutoNext) {
      setTimeout(() => {
        onAutoNext();
      }, 300);
    }
  };

  const options = question.options || ["예", "아니오", "모름"];

  return (
    <div className={styles.container}>
      <div className={styles.questionInfo}>
        <span className={styles.section}>{question.section}</span>
        <h2 className={styles.title}>{question.title}</h2>
        <p className={styles.questionText}>{question.question}</p>
      </div>

      <div className={styles.optionsContainer}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.optionButton} ${selected === option ? styles.selected : ''}`}
            onClick={() => handleSelect(option)}
          >
            <span className={styles.radioCircle}>
              {selected === option && <span className={styles.radioFill} />}
            </span>
            <span className={styles.optionText}>{option}</span>
          </button>
        ))}
      </div>

      {question.isOptional && (
        <p className={styles.optionalNote}>
          * 선택 문항입니다. 해당되지 않으면 건너뛸 수 있습니다.
        </p>
      )}
    </div>
  );
}
