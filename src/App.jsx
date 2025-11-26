import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Survey from './pages/Survey';
import Complete from './pages/Complete';
import Result from './pages/Result';
import TextAnalysis from './pages/TextAnalysis';
import AnalysisResult from './pages/AnalysisResult';
import ComprehensiveResult from './pages/ComprehensiveResult';

/**
 * 메인 앱 컴포넌트
 * 라우팅 설정:
 * - / : 랜딩 페이지 (ID 입력)
 * - /survey : 설문 페이지
 * - /complete : 설문 완료 페이지
 * - /result : 결과 페이지 (차트, 통계)
 * - /result/text : AI 분석 페이지 (서술형 + 전체 분석)
 * - /result/text/:questionId : 서술형 개별 분석 결과
 * - /result/comprehensive : 전체 종합 분석 결과
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Landing />} />

        {/* 설문 페이지 */}
        <Route path="/survey" element={<Survey />} />

        {/* 설문 완료 */}
        <Route path="/complete" element={<Complete />} />

        {/* 결과 페이지 */}
        <Route path="/result" element={<Result />} />

        {/* AI 분석 */}
        <Route path="/result/text" element={<TextAnalysis />} />
        <Route path="/result/text/:questionId" element={<AnalysisResult />} />
        <Route path="/result/comprehensive" element={<ComprehensiveResult />} />

        {/* 404 - 메인으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
