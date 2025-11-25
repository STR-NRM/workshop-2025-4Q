import { useState, useEffect, useRef } from 'react';
import styles from './TextQuestion.module.css';

/**
 * 서술형 질문 컴포넌트
 * 텍스트 입력이 필요하므로 자동 다음 이동 없음
 */
export default function TextQuestion({
  question,
  value,
  onChange,
}) {
  const [text, setText] = useState(value || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    setText(value || '');
  }, [value]);

  // 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setText(newValue);
    onChange(newValue);
  };

  const charCount = text.length;
  const minChars = 10;
  const maxChars = 1000;

  return (
    <div className={styles.container}>
      <div className={styles.questionInfo}>
        <span className={styles.section}>{question.section}</span>
        <h2 className={styles.title}>{question.title}</h2>
        <p className={styles.questionText}>{question.question}</p>
      </div>

      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={handleChange}
          placeholder="자유롭게 의견을 작성해주세요..."
          maxLength={maxChars}
          rows={4}
        />
        <div className={styles.footer}>
          <span className={`${styles.charCount} ${charCount < minChars ? styles.warning : ''}`}>
            {charCount} / {maxChars}자
          </span>
          {charCount > 0 && charCount < minChars && (
            <span className={styles.hint}>최소 {minChars}자 이상 작성해주세요</span>
          )}
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
