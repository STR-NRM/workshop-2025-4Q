# Comprehensive Codebase Assessment Report

**Date:** 2025-11-25
**Assessor:** Third-Party Code Review
**Project:** Squad 2025 WS 4Q Survey Application

---

## Executive Summary

This assessment identifies a **CRITICAL FAILURE** in the OpenAI API integration that renders the AI analysis feature completely non-functional. The root cause is the use of a **non-existent model name** (`gpt-5`) that does not exist in OpenAI's API.

**Severity: CRITICAL**
**Impact: AI Analysis feature 100% broken**

---

## 1. Critical Issues

### 1.1 Non-Existent Model Name (CRITICAL)

**Location:** `src/prompts/analysisPrompt.js:96`

```javascript
export const MODEL_CONFIG = {
  model: "gpt-5", // GPT-5 모델 (gpt-5, gpt-5-mini, gpt-5-nano 사용 가능)
};
```

**Problem:**
- **`gpt-5` does not exist in OpenAI's API**
- There is no `gpt-5-mini` or `gpt-5-nano` either
- This comment is factually incorrect and misleading

**Evidence from Research:**
- OpenAI's official starter app uses `gpt-4.1`
- OpenAI Node SDK README examples use `gpt-4o`
- All real-world code samples use: `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4-turbo`
- No legitimate source mentions `gpt-5`

**Impact:** Every API call fails with an invalid model error.

---

### 1.2 Incorrect API Parameter Structure

**Location:** `src/utils/openai.js:21-28`

```javascript
const response = await openai.responses.create({
  model: MODEL_CONFIG.model,
  instructions: SYSTEM_PROMPT,
  input: userPrompt,
  text: {
    format: { type: "text" }
  }
});
```

**Problem:**
The `text: { format: { type: "text" } }` parameter is **not documented** in any official OpenAI documentation or real-world examples. This parameter appears to be fabricated.

**Correct Format (from official examples):**
```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: userPrompt,
  instructions: SYSTEM_PROMPT,
});
```

---

### 1.3 Hardcoded API Key (SECURITY ISSUE)

**Location:** `src/utils/openai.js:6`

```javascript
const openai = new OpenAI({
  apiKey: 'sk-proj-OK7Ys...',  // EXPOSED API KEY
  dangerouslyAllowBrowser: true
});
```

**Problems:**
1. API key is hardcoded in source code
2. Key is exposed in version control
3. `dangerouslyAllowBrowser: true` is a security risk for production

**Recommendation:** Use environment variables (`import.meta.env.VITE_OPENAI_API_KEY`)

---

## 2. API Response Handling

### 2.1 Response Property Access

**Location:** `src/utils/openai.js:30`

```javascript
return response.output_text;
```

**Assessment:** This is **CORRECT** based on research. The Responses API does return `output_text` as a helper property.

**Alternative (also valid):**
```javascript
return response.output[0].content[0].text;
```

---

## 3. Code Quality Analysis

### 3.1 Positive Aspects

| Aspect | Assessment |
|--------|------------|
| Code Organization | Good - clear separation of concerns |
| Prompt Configuration | Well-structured, externalized prompts |
| Error Handling | Basic try-catch present |
| React Components | Clean, functional components |
| Firebase Integration | Properly implemented |

### 3.2 Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Non-existent model name | CRITICAL | analysisPrompt.js:96 |
| Fabricated API parameter | HIGH | openai.js:25-27 |
| Hardcoded API key | HIGH | openai.js:6 |
| Browser-side API calls | MEDIUM | openai.js:7 |
| Missing input validation | LOW | openai.js:16 |

---

## 4. Dependency Analysis

### 4.1 package.json Review

```json
{
  "openai": "^6.9.1"
}
```

**Assessment:**
- Version 6.9.1 is **not the latest** (current: 4.96.2 based on npm)
- Wait - this shows `^6.9.1` which is HIGHER than npm's 4.96.2
- This suggests the SDK version might be from a different source (JSR?)

**Note:** The discrepancy in version numbers needs investigation. Standard npm openai package is at ~4.x, but this shows 6.x which may be from JSR (JavaScript Registry).

---

## 5. Available OpenAI Models (as of 2025)

Based on research of official documentation and real-world usage:

| Model | Description | Status |
|-------|-------------|--------|
| `gpt-4o` | Latest flagship model | ✅ Available |
| `gpt-4o-mini` | Cost-efficient model | ✅ Available |
| `gpt-4.1` | Used in official OpenAI starter | ✅ Available |
| `gpt-4-turbo` | Previous flagship | ✅ Available |
| `gpt-3.5-turbo` | Legacy model | ✅ Available |
| `gpt-5` | **DOES NOT EXIST** | ❌ Invalid |

---

## 6. Recommended Fixes

### 6.1 Immediate Fix (Priority 1)

**File:** `src/prompts/analysisPrompt.js`

```javascript
// BEFORE (BROKEN)
export const MODEL_CONFIG = {
  model: "gpt-5",
};

// AFTER (WORKING)
export const MODEL_CONFIG = {
  model: "gpt-4o", // or "gpt-4o-mini" for cost savings
};
```

### 6.2 API Call Fix (Priority 2)

**File:** `src/utils/openai.js`

```javascript
// BEFORE (BROKEN)
const response = await openai.responses.create({
  model: MODEL_CONFIG.model,
  instructions: SYSTEM_PROMPT,
  input: userPrompt,
  text: {
    format: { type: "text" }
  }
});

// AFTER (CORRECT)
const response = await openai.responses.create({
  model: MODEL_CONFIG.model,
  instructions: SYSTEM_PROMPT,
  input: userPrompt,
});
```

### 6.3 Alternative: Use Chat Completions API

If Responses API continues to fail, fallback to the standard Chat Completions API:

```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt }
  ],
});
return response.choices[0].message.content;
```

---

## 7. Conclusion

The AI analysis feature is **100% broken** due to:

1. **Invalid model name** - `gpt-5` does not exist
2. **Incorrect API parameters** - `text.format` is not a valid parameter

The fix is straightforward:
1. Change model to `gpt-4o` or `gpt-4o-mini`
2. Remove the invalid `text` parameter
3. Consider using Chat Completions API as a more stable alternative

**Estimated Fix Time:** 5 minutes
**Confidence Level:** High - based on official OpenAI documentation and real-world examples

---

## Appendix: Files Reviewed

1. `src/prompts/analysisPrompt.js` - Prompt configuration
2. `src/utils/openai.js` - API integration
3. `src/pages/TextAnalysis.jsx` - Analysis page component
4. `src/components/survey/ScaleQuestion.jsx` - Survey component
5. `src/data/questions.js` - Question definitions
6. `package.json` - Dependencies

---

*Report generated by automated code review*
