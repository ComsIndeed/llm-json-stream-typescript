import React, { useState } from 'react';
import './StudyAppDemo.css';

const StudyAppDemo: React.FC = () => {
    const [inputText, setInputText] = useState('');

    return (
        <div className="study-app-container">
            <div className="main-wrapper">
                <div className="content-area">
                    {/* Chat Panel */}
                    <section className="chat-panel">
                        <div className="chat-header">
                            <h2>AI Study Tutor</h2>
                            <p>Ready to build your study set</p>
                        </div>
                        <div className="chat-messages">
                            <div className="message ai">
                                Hello! I'm your AI tutor. I can help you generate flashcards, practice quizzes, or explain complex concepts. What are we studying today?
                                <div className="message-time">10:02 AM</div>
                            </div>
                            <div className="message user">
                                Let's create 5 flashcards about Photosynthesis and a quick MCQ about the Calvin cycle.
                                <div className="message-time">10:05 AM</div>
                            </div>
                            <div className="message ai">
                                Understood. Generating your study materials on the whiteboard now...
                                <div className="message-time">10:05 AM</div>
                            </div>
                        </div>
                        <div className="chat-input-area">
                            <div className="input-container">
                                <textarea
                                    placeholder="Type a command (e.g., 'Make more cards')"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />
                                <div className="input-footer">
                                    <button className="send-btn">
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
                            {/* Flashcard 1 */}
                            <div className="study-card">
                                <div className="card-type">Flashcard</div>
                                <div className="card-title">Chlorophyll</div>
                                <div className="card-content">
                                    A green pigment, present in all green plants, responsible for the absorption of light to provide energy for photosynthesis.
                                </div>
                                <div className="card-footer">
                                    <div className="card-action">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                        Flip card
                                    </div>
                                    <div className="card-action">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Card */}
                            <div className="study-card">
                                <div className="card-type">Quick Quiz</div>
                                <div className="card-title">Which part of the cell does the Calvin Cycle occur in?</div>
                                <div className="quiz-options">
                                    <div className="quiz-option">
                                        Thylakoid Membrane
                                        <div className="option-check"></div>
                                    </div>
                                    <div className="quiz-option selected">
                                        Stroma
                                        <div className="option-check"></div>
                                    </div>
                                    <div className="quiz-option">
                                        Cytoplasm
                                        <div className="option-check"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Flashcard 2 */}
                            <div className="study-card">
                                <div className="card-type">Flashcard</div>
                                <div className="card-title">ATP</div>
                                <div className="card-content">
                                    Adenosine triphosphate is an organic compound that provides energy to drive many processes in living cells.
                                </div>
                                <div className="card-footer">
                                    <div className="card-action">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                        Flip card
                                    </div>
                                    <div className="card-action">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Flashcard 3 */}
                            <div className="study-card">
                                <div className="card-type">Flashcard</div>
                                <div className="card-title">Stomata</div>
                                <div className="card-content">
                                    Microscopic pores found on the epidermis of leaves and stems that facilitate gas exchange.
                                </div>
                                <div className="card-footer">
                                    <div className="card-action">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                        Flip card
                                    </div>
                                    <div className="card-action">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                                    </div>
                                </div>
                            </div>

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
