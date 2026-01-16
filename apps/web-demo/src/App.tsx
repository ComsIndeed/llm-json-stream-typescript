import { useState } from 'react';
import './App.css'
import MainDemo from './demos/Main_Demo/MainDemo'
import UiGenDemo from './demos/Ui_Gen_Demo/UiGenDemo';
import ChatDemo from './demos/Chat_Demo/ChatDemo';
import StudyAppDemo from './demos/Study_App_Demo/StudyAppDemo';

type DemoType = 'MainDemo' | 'UiGenDemo' | 'ChatDemo' | 'StudyAppDemo';

function App() {
  const [selectedDemo, setSelectedDemo] = useState<DemoType>('MainDemo');

  const renderDemo = () => {
    switch (selectedDemo) {
      case 'MainDemo':
        return <MainDemo />;
      case 'UiGenDemo':
        return <UiGenDemo />;
      case 'ChatDemo':
        return <ChatDemo />;
      case 'StudyAppDemo':
        return <StudyAppDemo />;
      default:
        return null;
    }
  };

  return (
    <div>
      <nav style={{
        position: 'fixed',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        gap: '8px',
        background: 'rgba(0,0,0,0.5)',
        padding: '4px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button
          style={{ background: selectedDemo === 'MainDemo' ? '#0ea5e9' : 'transparent', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
          onClick={() => setSelectedDemo('MainDemo')}
        >
          Main Demo
        </button>
        <button
          style={{ background: selectedDemo === 'StudyAppDemo' ? '#0ea5e9' : 'transparent', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px' }}
          onClick={() => setSelectedDemo('StudyAppDemo')}
        >
          Study App Demo
        </button>
      </nav>
      {renderDemo()}
    </div >
  )
}

export default App
