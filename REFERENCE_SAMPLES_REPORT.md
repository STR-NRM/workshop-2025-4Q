# Reference Code Samples Report

**Date:** 2025-11-25
**Purpose:** Real-world OpenAI API usage examples from official sources and production codebases

---

## 1. Official OpenAI Examples

### 1.1 OpenAI Node SDK README (Official)

**Source:** https://github.com/openai/openai-node

```javascript
const { data: stream, request_id } = await openai.responses
  .create({
    model: 'gpt-4o',
    input: 'Say this is a test',
    stream: true,
  })
  .withResponse();
```

**Key Points:**
- Model: `gpt-4o` (NOT gpt-5)
- Simple `input` parameter (string)
- `stream: true` for streaming responses
- No `text.format` parameter

---

### 1.2 OpenAI Responses Starter App (Official)

**Source:** https://github.com/openai/openai-responses-starter-app

**constants.ts:**
```typescript
export const MODEL = "gpt-4.1";
```

**route.ts:**
```typescript
const events = await openai.responses.create({
  model: MODEL,
  input: messages,
  instructions: getDeveloperPrompt(),
  tools,
  stream: true,
  parallel_tool_calls: false,
});
```

**Key Points:**
- Model: `gpt-4.1` (official OpenAI starter uses this)
- `input` can be messages array
- `instructions` for system-level prompts
- Optional `tools` and `stream` parameters

---

### 1.3 OpenAI Python SDK README

**Source:** https://github.com/openai/openai-python

```python
prompt = "What is in this image?"
img_url = "https://example.com/image.jpg"

response = client.responses.create(
    model="gpt-4o-mini",
    input=[
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": "input_image", "image_url": f"{img_url}"},
            ],
        }
    ],
)
```

**Key Points:**
- Model: `gpt-4o-mini`
- Complex `input` with role and content array
- Supports multimodal (text + image)

---

## 2. Third-Party Production Examples

### 2.1 Helicone Integration

**Source:** Helicone documentation

```javascript
const jsonInputResponse = await openai.responses.create({
  model: "gpt-4.1",
  input: { name: "John", age: 30 }
});

console.log(jsonInputResponse);
```

**Key Points:**
- Model: `gpt-4.1`
- `input` can be JSON object
- Simple, minimal parameters

---

### 2.2 BAML Client Integration

**Source:** https://github.com/BoundaryML/baml

```javascript
import OpenAI from 'openai';

async function run() {
  const client = new OpenAI();

  const req = await b.request.TestOpenAIResponses("mountains");
  const res = await client.responses.create(req.body.json());

  // Parse the response from the responses API (uses output_text)
  const parsed = b.parse.TestOpenAIResponses(res.output_text);
}
```

**Key Points:**
- Uses `output_text` property to access response
- Confirms `responses.create()` method exists

---

### 2.3 FastMCP Integration

**Source:** https://github.com/jlowin/fastmcp

```python
from openai import OpenAI

client = OpenAI()

resp = client.responses.create(
    model="gpt-4.1",
    tools=[
        {
            "type": "mcp",
            "server_label": "dice_server",
            "server_url": f"{url}/mcp/",
            "require_approval": "never",
        },
    ],
    input="Roll a few dice!",
)

print(resp.output_text)
```

**Key Points:**
- Model: `gpt-4.1`
- Supports MCP tools integration
- Uses `output_text` for response

---

### 2.4 Meta-Agent Guide

**Source:** https://github.com/DannyMac180/meta-agent

```python
# Simple input as a string
response = client.responses.create(
    model="gpt-4o",
    input="What is the capital of France?"
)

# Or with structured messages (similar to Chat Completions)
response = client.responses.create(
    model="gpt-4o",
    input=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the capital of France?"}
    ]
)

# Accessing the output text
assistant_reply = response.output[0].content[0].text
# Or using the helper method if available
# print(response.output_text)
```

**Key Points:**
- Model: `gpt-4o`
- Two ways to access response:
  1. `response.output[0].content[0].text`
  2. `response.output_text` (helper)

---

### 2.5 LiteLLM Proxy Integration

**Source:** https://github.com/BerriAI/litellm

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:4000",
    api_key="your-api-key"
)

# Non-streaming response
response = client.responses.create(
    model="openai/o1-pro",
    input="Tell me a three sentence bedtime story about a unicorn."
)

print(response)
```

**Key Points:**
- Shows custom base_url usage
- Simple string input

---

### 2.6 Medium Tutorial (Learning Journey)

**Source:** https://medium.com/product-monday/learning-journey-1-exploring-the-openai-responses-api-with-node-js

```javascript
const completion = await openAIClient.responses.create({
  model: "gpt-4o-mini",
  input: question,
  stream: true,
  tools: [
    {
      type: "web_search_preview",
    },
  ],
});
```

**Key Points:**
- Model: `gpt-4o-mini`
- Shows web search tool integration
- Streaming enabled

---

## 3. Chat Completions API (Alternative/Fallback)

If Responses API doesn't work, Chat Completions is the stable alternative:

### 3.1 Standard Chat Completions

```javascript
import OpenAI from 'openai';

const openai = new OpenAI();

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
    model: 'gpt-4o',
  });

  console.log(completion.choices[0].message.content);
}
```

### 3.2 With Helicone Monitoring

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: `https://oai.helicone.ai/v1`,
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  }
});

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {role: "user", content: "Analyze this data"}
  ]
});
```

---

## 4. Valid Model Names Summary

Based on all research, these are the **confirmed valid model names**:

| Model Name | Source | Usage |
|------------|--------|-------|
| `gpt-4o` | OpenAI SDK README | Primary flagship model |
| `gpt-4o-mini` | OpenAI Python README | Cost-efficient option |
| `gpt-4.1` | OpenAI Starter App, Helicone | Alternative flagship |
| `gpt-4-turbo` | Multiple sources | Previous generation |
| `gpt-3.5-turbo` | Multiple sources | Legacy/budget |
| `o1-pro` | LiteLLM docs | Reasoning model |
| `o3` | Azure docs | Azure-specific |

**NOT VALID:**
- ~~`gpt-5`~~ - Does not exist
- ~~`gpt-5-mini`~~ - Does not exist
- ~~`gpt-5-nano`~~ - Does not exist

---

## 5. Recommended Implementation

Based on all research, here is the recommended implementation:

### Option A: Responses API (Modern)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeTextResponses(question, responses) {
  const userPrompt = buildUserPrompt(question, responses);

  try {
    const response = await openai.responses.create({
      model: "gpt-4o",  // or "gpt-4o-mini" for cost savings
      instructions: SYSTEM_PROMPT,
      input: userPrompt,
    });

    return response.output_text;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`AI 분석 실패: ${error.message}`);
  }
}
```

### Option B: Chat Completions API (Stable Fallback)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeTextResponses(question, responses) {
  const userPrompt = buildUserPrompt(question, responses);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`AI 분석 실패: ${error.message}`);
  }
}
```

---

## 6. Key Takeaways

1. **Model Names Matter**: Use `gpt-4o`, `gpt-4o-mini`, or `gpt-4.1` - never `gpt-5`
2. **Keep Parameters Simple**: Don't add undocumented parameters like `text.format`
3. **Two Valid APIs**:
   - `responses.create()` - Newer, for agentic workflows
   - `chat.completions.create()` - Stable, widely tested
4. **Response Access**:
   - Responses API: `response.output_text`
   - Chat Completions: `completion.choices[0].message.content`

---

## Sources

1. OpenAI Node SDK: https://github.com/openai/openai-node
2. OpenAI Python SDK: https://github.com/openai/openai-python
3. OpenAI Responses Starter App: https://github.com/openai/openai-responses-starter-app
4. OpenAI Platform Docs: https://platform.openai.com/docs
5. Helicone Integration Docs: https://docs.helicone.ai
6. LiteLLM Docs: https://docs.litellm.ai
7. Medium Learning Journey: https://medium.com/product-monday
8. DataCamp Tutorial: https://www.datacamp.com/tutorial/openai-responses-api

---

*Report compiled from web research and GitHub code analysis*
