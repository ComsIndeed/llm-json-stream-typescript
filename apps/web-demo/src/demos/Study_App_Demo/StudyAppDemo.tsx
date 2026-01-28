import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JsonStream, type AsyncJson } from '../../../../../packages/llm-json-stream/dist';
import './StudyAppDemo.css';

// ============================================================================
// TYPE DEFINITIONS - Schema for LLM JSON response
// ============================================================================

interface MessagePart {
    type: 'message';
    text: string;
}

interface FlashcardPart {
    type: 'generate-flashcard';
    front: string;
    back: string;
}

interface MCQPart {
    type: 'generate-multiple-choice-question';
    question: string;
    choices: string[];
    answer: string;
}

type Part = MessagePart | FlashcardPart | MCQPart;
type PartType = 'message' | 'generate-flashcard' | 'generate-multiple-choice-question';

interface LLMResponse {
    parts: Part[];
}

// ============================================================================
// STREAMING COMPONENTS
// ============================================================================

/** Hook to stream text from an AsyncIterable */
function useStreamingText(stream: AsyncIterable<string> | null): string {
    const [text, setText] = useState('');
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (!stream || hasStartedRef.current) return;
        hasStartedRef.current = true;

        let cancelled = false;

        (async () => {
            try {
                for await (const chunk of stream) {
                    if (cancelled) break;
                    setText(prev => prev + chunk);
                }
            } catch (e) {
                // Stream ended
            }
        })();

        return () => { cancelled = true; };
    }, [stream]);

    return text;
}

/** Message component */
function StreamingMessage({ asyncJson }: { asyncJson: AsyncJson<Part> }) {
    const textStream = useMemo(() => asyncJson.get<string>('text'), [asyncJson]);
    const text = useStreamingText(textStream);

    return (
        <div className="streaming-message">
            <div className="message-icon">💬</div>
            <div className="message-text">{text || '...'}</div>
        </div>
    );
}

/** Flashcard component */
function StreamingFlashcard({ asyncJson }: { asyncJson: AsyncJson<Part> }) {
    const frontStream = useMemo(() => asyncJson.get<string>('front'), [asyncJson]);
    const backStream = useMemo(() => asyncJson.get<string>('back'), [asyncJson]);

    const front = useStreamingText(frontStream);
    const back = useStreamingText(backStream);
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="study-card streaming" onClick={() => setIsFlipped(!isFlipped)}>
            <div className="card-type">Flashcard</div>
            <div className="card-title">{front || '...'}</div>
            <div className="card-content" style={{ opacity: isFlipped ? 1 : 0.5 }}>
                {isFlipped ? (back || '...') : 'Click to reveal'}
            </div>
            <div className="card-footer">
                <div className="card-action">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                    Flip card
                </div>
            </div>
        </div>
    );
}

/** MCQ component */
function StreamingMCQ({ asyncJson }: { asyncJson: AsyncJson<Part> }) {
    const questionStream = useMemo(() => asyncJson.get<string>('question'), [asyncJson]);
    const answerStream = useMemo(() => asyncJson.get<string>('answer'), [asyncJson]);
    const choicesStream = useMemo(() => asyncJson.get<string[]>('choices'), [asyncJson]);

    const question = useStreamingText(questionStream);
    const answer = useStreamingText(answerStream);

    const [choices, setChoices] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const hasStartedChoicesRef = useRef(false);

    useEffect(() => {
        if (!choicesStream || hasStartedChoicesRef.current) return;
        hasStartedChoicesRef.current = true;

        let cancelled = false;

        (async () => {
            try {
                let idx = 0;
                for await (const choiceItem of choicesStream) {
                    if (cancelled) break;
                    const currentIdx = idx++;

                    // choiceItem could be a string (final value) or AsyncIterable (streaming)
                    if (typeof choiceItem === 'string') {
                        // Already a complete string
                        setChoices(prev => {
                            const updated = [...prev, choiceItem];
                            return updated;
                        });
                    } else if (choiceItem && typeof choiceItem === 'object' && Symbol.asyncIterator in choiceItem) {
                        // It's an AsyncIterable, stream it
                        setChoices(prev => [...prev, '']);

                        (async () => {
                            try {
                                for await (const chunk of choiceItem as AsyncIterable<string>) {
                                    if (cancelled) break;
                                    setChoices(prev => {
                                        const updated = [...prev];
                                        updated[currentIdx] = (updated[currentIdx] || '') + chunk;
                                        return updated;
                                    });
                                }
                            } catch (e) { /* done */ }
                        })();
                    } else {
                        // Fallback: treat as string
                        setChoices(prev => [...prev, String(choiceItem)]);
                    }
                }
            } catch (e) { /* done */ }
        })();

        return () => { cancelled = true; };
    }, [choicesStream]);

    const handleSelect = (index: number) => {
        setSelectedIndex(index);
        setShowAnswer(true);
    };

    return (
        <div className="study-card streaming mcq">
            <div className="card-type">Quick Quiz</div>
            <div className="card-title">{question || '...'}</div>
            <div className="quiz-options">
                {choices.map((choice, idx) => {
                    const isCorrect = showAnswer && choice === answer;
                    const isWrong = showAnswer && selectedIndex === idx && choice !== answer;

                    return (
                        <div
                            key={idx}
                            className={`quiz-option ${selectedIndex === idx ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                            onClick={() => handleSelect(idx)}
                        >
                            {choice || '...'}
                            <div className="option-check"></div>
                        </div>
                    );
                })}
            </div>
            {showAnswer && (
                <div className="answer-feedback">
                    {selectedIndex !== null && choices[selectedIndex] === answer
                        ? '✓ Correct!'
                        : `✗ The answer is: ${answer}`}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PART RENDERER - Type is already known from parent
// ============================================================================

interface PartRendererProps {
    partType: PartType;
    asyncJson: AsyncJson<Part>;
    index: number;
}

function PartRenderer({ partType, asyncJson, index }: PartRendererProps) {
    const animStyle = { animation: `partIn 300ms ease ${index * 50}ms both` };

    return (
        <div className="streaming-part" style={animStyle}>
            {partType === 'message' && <StreamingMessage asyncJson={asyncJson} />}
            {partType === 'generate-flashcard' && <StreamingFlashcard asyncJson={asyncJson} />}
            {partType === 'generate-multiple-choice-question' && <StreamingMCQ asyncJson={asyncJson} />}
        </div>
    );
}

// ============================================================================
// SYSTEM INSTRUCTION
// ============================================================================

const SYSTEM_INSTRUCTION = `You are a study assistant. You ONLY respond in JSON. Never respond with plain text.

YOUR RESPONSE FORMAT:
You must ALWAYS respond with a JSON object that has ONE property called "parts".
"parts" is an array of objects. Each object MUST have a "type" property.

THERE ARE EXACTLY 3 TYPES YOU CAN USE:

TYPE 1: "message"
Use this to talk to the user. It has a "text" property with your message.
Example: {"type": "message", "text": "Hello! How can I help you study?"}

TYPE 2: "generate-flashcard"  
Use this to create a flashcard. It has "front" and "back" properties.
Example: {"type": "generate-flashcard", "front": "What is photosynthesis?", "back": "The process by which plants convert sunlight into energy"}

TYPE 3: "generate-multiple-choice-question"
Use this to create a quiz question. It has "question", "choices" (array), and "answer" properties.
The "answer" must be the EXACT same text as one of the choices.
Example: {"type": "generate-multiple-choice-question", "question": "What color is the sky?", "choices": ["Red", "Blue", "Green"], "answer": "Blue"}

COMPLETE RESPONSE EXAMPLES:

Example 1 - Just a message:
{"parts": [{"type": "message", "text": "Sure, I can help you with biology!"}]}

Example 2 - Message with a flashcard:
{"parts": [{"type": "message", "text": "Here is a flashcard about cells:"}, {"type": "generate-flashcard", "front": "What is a cell?", "back": "The basic unit of life"}]}

Example 3 - Multiple items:
{"parts": [{"type": "message", "text": "Here are some study materials:"}, {"type": "generate-flashcard", "front": "H2O", "back": "Water"}, {"type": "generate-multiple-choice-question", "question": "What is 2+2?", "choices": ["3", "4", "5"], "answer": "4"}]}

CRITICAL RULES:
1. Your ENTIRE response must be valid JSON
2. Always start with {"parts": [
3. Always end with ]}
4. Never write anything outside the JSON
5. Never use markdown code blocks
6. Never explain what you're doing outside the JSON
7. Put all explanations inside "message" type parts`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface StreamingPartData {
    index: number;
    partType: PartType;
    asyncJson: AsyncJson<Part>;
}

const StudyAppDemo: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [inputText, setInputText] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [parts, setParts] = useState<StreamingPartData[]>([]);
    const [rawJson, setRawJson] = useState('');
    const [error, setError] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const jsonStreamRef = useRef<JsonStream<LLMResponse> | null>(null);

    const scrollToBottom = () => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [parts]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !apiKey) return;

        const messageText = inputText.trim();
        setInputText('');
        setIsStreaming(true);
        setParts([]);
        setRawJson('');
        setError(null);

        if (jsonStreamRef.current) {
            jsonStreamRef.current.dispose();
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-flash-lite-latest',
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const promptWithReminder = `User request: ${messageText}

Remember: Respond ONLY with valid JSON in the format {"parts": [...]}. No other text.`;

            const result = await model.generateContentStream(promptWithReminder);

            async function* createTextStream() {
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    setRawJson(prev => prev + text);
                    yield text;
                }
            }

            const jsonStream = JsonStream.parse<LLMResponse>(createTextStream());
            jsonStreamRef.current = jsonStream;

            const partsStream = jsonStream.get<Part[]>('parts');

            let partIndex = 0;
            for await (const partAsyncJson of partsStream) {
                const currentIndex = partIndex++;

                // EAGERLY await the type before adding to React state
                // This ensures we have the type before the component mounts
                const partType = await partAsyncJson.get<string>('type') as PartType;

                console.log('Part', currentIndex, 'type:', partType);

                setParts(prev => {
                    if (prev.some(p => p.index === currentIndex)) return prev;
                    return [...prev, {
                        index: currentIndex,
                        partType,
                        asyncJson: partAsyncJson
                    }];
                });
            }

        } catch (err) {
            console.error("Error:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="study-app-container">
            <style>{`
                @keyframes partIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .streaming-part {
                    margin-bottom: 12px;
                }
                .streaming-message {
                    display: flex;
                    gap: 12px;
                    padding: 16px;
                    background: var(--bg-card);
                    border-radius: 12px;
                    border: 1px solid var(--border);
                }
                .message-icon {
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }
                .message-text {
                    color: var(--text-primary);
                    line-height: 1.5;
                    white-space: pre-wrap;
                }
                .loading-shimmer {
                    padding: 16px;
                    background: linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 12px;
                    color: var(--text-secondary);
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .study-card.streaming {
                    cursor: pointer;
                }
                .study-card.mcq .quiz-option.correct {
                    background: rgba(34, 197, 94, 0.2);
                    border-color: rgb(34, 197, 94);
                }
                .study-card.mcq .quiz-option.wrong {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgb(239, 68, 68);
                }
                .answer-feedback {
                    padding: 8px 12px;
                    margin-top: 8px;
                    background: var(--bg-sidebar);
                    border-radius: 8px;
                    font-size: 0.85rem;
                }
                .error-message {
                    padding: 16px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    color: rgb(239, 68, 68);
                }
                .raw-json-panel {
                    background: var(--bg-sidebar);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 12px;
                    flex: 1;
                    overflow: auto;
                }
                .raw-json-panel pre {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    white-space: pre-wrap;
                    word-break: break-all;
                }
            `}</style>

            <div className="main-wrapper">
                <div className="content-area">
                    <section className="chat-panel">
                        <div className="api-key-container" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                            <input
                                type="password"
                                placeholder="Gemini AI API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-sidebar)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div className="chat-header">
                            <h2>AI Study Tutor</h2>
                            <p>Streaming JSON Parser Demo</p>
                        </div>
                        <div className="chat-messages" ref={contentRef}>
                            {parts.length === 0 && !isStreaming && !error && (
                                <div className="message ai">
                                    <p>Hello! I'm your AI tutor. Ask me to create flashcards or quiz questions!</p>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>
                                        Try: "Make 3 flashcards about photosynthesis" or "Quiz me on world capitals"
                                    </p>
                                </div>
                            )}

                            {parts.map(({ index, partType, asyncJson }) => (
                                <PartRenderer key={index} partType={partType} asyncJson={asyncJson} index={index} />
                            ))}

                            {isStreaming && parts.length === 0 && (
                                <div className="loading-shimmer">Waiting for response...</div>
                            )}

                            {error && (
                                <div className="error-message">Error: {error}</div>
                            )}
                        </div>
                        <div className="chat-input-area">
                            <div className="input-container">
                                <textarea
                                    placeholder="Type a command (e.g., 'Make flashcards about biology')"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <div className="input-footer">
                                    <button className="send-btn" onClick={handleSendMessage} disabled={isStreaming || !apiKey}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="action-chips">
                                <div className="chip" onClick={() => setInputText('Make 3 flashcards about photosynthesis')}>Flashcards</div>
                                <div className="chip" onClick={() => setInputText('Quiz me with 2 multiple choice questions about history')}>Quiz Me</div>
                                <div className="chip" onClick={() => setInputText('Explain the water cycle and make a flashcard')}>Explain + Card</div>
                            </div>
                        </div>
                    </section>

                    <section className="whiteboard-panel">
                        <div className="whiteboard-toolbar">
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                📡 Raw JSON Stream
                            </h3>
                        </div>
                        <div className="raw-json-panel" style={{ margin: '16px' }}>
                            <pre>{rawJson || 'JSON stream will appear here as it arrives...'}</pre>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default StudyAppDemo;
