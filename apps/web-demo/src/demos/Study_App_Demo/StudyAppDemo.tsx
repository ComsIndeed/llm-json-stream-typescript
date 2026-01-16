import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import './StudyAppDemo.css';

type Message = {
    role: 'ai' | 'user';
    content: string;
    time: string;
};

type Flashcard = {
    type: 'Flashcard';
    title: string;
    content: string;
};

type MCQ = {
    type: 'MCQ';
    question: string;
    options: string[];
    selectedIndex?: number;
};

type StudyCard = Flashcard | MCQ;

const StudyAppDemo: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    };

    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'ai',
            content: "Hello! I'm your AI tutor. I can help you generate flashcards, practice quizzes, or explain complex concepts. What are we studying today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const [cards] = useState<StudyCard[]>([
        {
            type: 'Flashcard',
            title: 'Chlorophyll',
            content: 'A green pigment, present in all green plants, responsible for the absorption of light to provide energy for photosynthesis.'
        },
        {
            type: 'MCQ',
            question: 'Which part of the cell does the Calvin Cycle occur in?',
            options: ['Thylakoid Membrane', 'Stroma', 'Cytoplasm'],
            selectedIndex: 1
        },
        {
            type: 'Flashcard',
            title: 'ATP',
            content: 'Adenosine triphosphate is an organic compound that provides energy to drive many processes in living cells.'
        },
        {
            type: 'Flashcard',
            title: 'Stomata',
            content: 'Microscopic pores found on the epidermis of leaves and stems that facilitate gas exchange.'
        }
    ]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !apiKey) return;

        const messageText = inputText.trim();
        const userMsg: Message = {
            role: 'user',
            content: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

            const result = await model.generateContentStream(messageText);

            const aiMsg: Message = {
                role: 'ai',
                content: '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);

            let fullContent = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullContent += chunkText;
                const currentContent = fullContent;
                setMessages(prev => {
                    const newMessages = prev.slice(0, -1);
                    return [...newMessages, {
                        role: 'ai' as const,
                        content: currentContent,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }];
                });
            }
        } catch (error) {
            console.error("Error calling Gemini:", error);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "Error: Failed to connect to Gemini..",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="study-app-container">
            <div className="main-wrapper">
                <div className="content-area">
                    {/* Chat Panel */}
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
                            <p>Ready to build your study set</p>
                        </div>
                        <div className="chat-messages" ref={chatMessagesRef}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`message ${msg.role}`}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    <div className="message-time">{msg.time}</div>
                                </div>
                            ))}
                            {isTyping && <div className="message ai">Typing...</div>}
                        </div>
                        <div className="chat-input-area">
                            <div className="input-container">
                                <textarea
                                    placeholder="Type a command (e.g., 'Make more cards')"
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
                                    <button className="send-btn" onClick={handleSendMessage} disabled={isTyping || !apiKey}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="action-chips">
                                <div className="chip">Summarize</div>
                                <div className="chip">Add Practice Quiz</div>
                                <div className="chip">Explainer Video</div>
                            </div>
                        </div>
                    </section>

                    {/* Whiteboard Panel */}
                    <section className="whiteboard-panel">
                        <div className="whiteboard-toolbar">
                            <div className="toolbar-group">
                                <div className="tool-btn active">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" /></svg>
                                </div>
                                <div className="tool-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
                                </div>
                            </div>
                            <div className="toolbar-group">
                                <div className="tool-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                                </div>
                                <div className="tool-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                </div>
                                <div className="tool-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="card-grid">
                            {cards.map((card, idx) => (
                                <div key={idx} className="study-card">
                                    {card.type === 'Flashcard' ? (
                                        <>
                                            <div className="card-type">Flashcard</div>
                                            <div className="card-title">{card.title}</div>
                                            <div className="card-content">{card.content}</div>
                                            <div className="card-footer">
                                                <div className="card-action">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                                    Flip card
                                                </div>
                                                <div className="card-action">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="card-type">Quick Quiz</div>
                                            <div className="card-title">{card.question}</div>
                                            <div className="quiz-options">
                                                {card.options.map((option, oIdx) => (
                                                    <div key={oIdx} className={`quiz-option ${card.selectedIndex === oIdx ? 'selected' : ''}`}>
                                                        {option}
                                                        <div className="option-check"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="zoom-controls">
                            <div className="zoom-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                            </div>
                            <div className="zoom-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default StudyAppDemo;
