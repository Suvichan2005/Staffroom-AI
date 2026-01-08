/**
 * Mock AI Provider
 * 
 * Provides mock responses for testing and as ultimate fallback.
 * No external API calls - always available.
 */

/**
 * Mock responses for different prompt types
 */
const MOCK_RESPONSES = {
  greeting: "Hello! I'm your AI teaching assistant (running in mock mode). I can help with lesson planning, quizzes, and tracking progress. What would you like to do?",
  
  progress: "Based on your current progress, you've completed approximately 45% of the syllabus. The next topic to cover is 'Chapter 3: The French Revolution'. Would you like me to generate a quiz for the completed topics?",
  
  quiz: `Here's a quick quiz on the topic:

1. What year did the French Revolution begin?
   a) 1776
   b) 1789
   c) 1799
   d) 1804
   
   Correct answer: b) 1789

2. Who was the King of France at the start of the Revolution?
   a) Louis XIV
   b) Louis XV
   c) Louis XVI
   d) Napoleon
   
   Correct answer: c) Louis XVI`,
  
  schedule: "Your schedule for today:\n- 9:00 AM: History 8B\n- 10:30 AM: History 6A\n- 2:00 PM: Geography 7C\n\nYou have 3 classes scheduled.",
  
  attendance: "I've noted the attendance. Students marked: Rahul (present), Priya (present), Amit (absent). Would you like me to send absence notifications?",
  
  default: "I understand your request. In mock mode, I'm providing a sample response. For full AI capabilities, please ensure the AI provider is properly configured.",
};

/**
 * Detect prompt type for mock response selection
 */
function detectPromptType(prompt) {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'greeting';
  }
  if (lower.includes('progress') || lower.includes('syllabus') || lower.includes('complete')) {
    return 'progress';
  }
  if (lower.includes('quiz') || lower.includes('question') || lower.includes('test')) {
    return 'quiz';
  }
  if (lower.includes('schedule') || lower.includes('class') || lower.includes('today')) {
    return 'schedule';
  }
  if (lower.includes('attendance') || lower.includes('present') || lower.includes('absent')) {
    return 'attendance';
  }
  
  return 'default';
}

/**
 * Mock AI Provider Implementation
 */
class MockProvider {
  constructor() {
    this.name = 'mock';
  }

  /**
   * Always available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    return true;
  }

  /**
   * Generate mock response
   * @param {import('./types.js').GenerateRequest} request
   * @returns {Promise<import('./types.js').GenerateResponse>}
   */
  async generate(request) {
    const { prompt, tools } = request;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    
    // Check for tool-calling scenarios
    if (tools && tools.length > 0) {
      const lower = prompt.toLowerCase();
      
      // Mock tool calls for common scenarios
      if (lower.includes('next topic') || lower.includes('what should i teach')) {
        return {
          text: '',
          toolCalls: [{
            id: 'mock_call_1',
            name: 'getNextTopic',
            arguments: { sectionId: '8B' },
          }],
          finishReason: 'tool_calls',
        };
      }
      
      if (lower.includes('progress') && (lower.includes('get') || lower.includes('show') || lower.includes('check'))) {
        return {
          text: '',
          toolCalls: [{
            id: 'mock_call_2',
            name: 'getProgress',
            arguments: {},
          }],
          finishReason: 'tool_calls',
        };
      }
      
      if (lower.includes('schedule') || lower.includes('class today')) {
        return {
          text: '',
          toolCalls: [{
            id: 'mock_call_3',
            name: 'getSchedule',
            arguments: { daysAhead: 1 },
          }],
          finishReason: 'tool_calls',
        };
      }
      
      if (lower.includes('navigate') || lower.includes('go to')) {
        const destination = lower.includes('dashboard') ? 'dashboard' 
          : lower.includes('schedule') ? 'schedule'
          : lower.includes('attendance') ? 'attendance'
          : 'dashboard';
        
        return {
          text: '',
          toolCalls: [{
            id: 'mock_call_4',
            name: 'navigateTo',
            arguments: { destination },
          }],
          finishReason: 'tool_calls',
        };
      }
    }
    
    // Return text response
    const promptType = detectPromptType(prompt);
    const text = MOCK_RESPONSES[promptType];
    
    return {
      text,
      toolCalls: [],
      finishReason: 'stop',
      usage: {
        promptTokens: prompt.length / 4,
        completionTokens: text.length / 4,
      },
    };
  }

  /**
   * Generate mock streaming response
   * @param {import('./types.js').GenerateRequest} request
   * @returns {AsyncIterable<import('./types.js').StreamChunk>}
   */
  async *generateStream(request) {
    const response = await this.generate(request);
    
    // Stream text character by character with small delays
    const text = response.text;
    const chunkSize = 10;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      await new Promise(resolve => setTimeout(resolve, 30));
      yield {
        text: text.slice(i, i + chunkSize),
        done: false,
      };
    }
    
    yield {
      text: '',
      toolCalls: response.toolCalls,
      done: true,
    };
  }
}

/**
 * Mock Voice Provider Implementation
 */
class MockVoiceProvider {
  constructor() {
    this.name = 'mock';
  }

  /**
   * Always available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    return true;
  }

  /**
   * Mock transcription
   * @param {Blob} audio
   * @returns {Promise<import('./types.js').TranscriptionResult>}
   */
  async transcribe(audio) {
    // Simulate processing time based on audio size
    const delay = Math.min(audio.size / 1000, 2000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      text: 'Mock transcription: The teacher said something about the lesson.',
      confidence: 0.85,
      method: 'mock',
    };
  }

  /**
   * Create mock streaming session
   * @param {import('./types.js').StreamingSessionOptions} options
   * @returns {Object}
   */
  createStreamingSession(options) {
    return new MockStreamingSession(options);
  }
}

/**
 * Mock Streaming Session
 */
class MockStreamingSession {
  constructor(options) {
    this.options = options;
    this.onTranscript = options.onTranscript || (() => {});
    this.onToolCall = options.onToolCall || (() => {});
    this.onError = options.onError || console.error;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.isStreaming = false;
    this.interval = null;
  }

  async connect() {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.onStatusChange('connected');
  }

  async start() {
    await this.connect();
    this.isStreaming = true;
    this.onStatusChange('streaming');
    
    // Simulate periodic transcripts
    const mockPhrases = [
      'Rahul present',
      'Priya present',
      'Amit absent',
    ];
    
    let index = 0;
    this.interval = setInterval(() => {
      if (index < mockPhrases.length) {
        const phrase = mockPhrases[index];
        this.onTranscript(phrase, true);
        
        // Generate mock tool call for attendance
        if (phrase.includes('present')) {
          this.onToolCall({
            id: `mock_voice_${index}`,
            name: 'mark_student_present',
            arguments: { 
              student_name: phrase.replace(' present', ''),
            },
          });
        } else if (phrase.includes('absent')) {
          this.onToolCall({
            id: `mock_voice_${index}`,
            name: 'mark_student_absent',
            arguments: { 
              student_name: phrase.replace(' absent', ''),
            },
          });
        }
        
        index++;
      }
    }, 2000);
  }

  async stop() {
    this.isStreaming = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.onStatusChange('disconnected');
    
    return {
      text: 'Mock session ended',
      confidence: 0.85,
      method: 'mock',
    };
  }
}

// Export singleton instances
export const mockProvider = new MockProvider();
export const mockVoiceProvider = new MockVoiceProvider();

// Export classes for testing
export { MockProvider, MockVoiceProvider, MockStreamingSession };
