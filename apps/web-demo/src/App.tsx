import { useState } from 'react';
import './App.css'
import MainDemo from './demos/Main_Demo/MainDemo'
import UiGenDemo from './demos/Ui_Gen_Demo/UiGenDemo';
import ChatDemo from './demos/Chat_Demo/ChatDemo';

type DemoType = 'MainDemo' | 'UiGenDemo' | 'ChatDemo';

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
      default:
        return null;
    }
  };

  return (
    <div>
      <nav style={{ position: 'absolute', bottom: 0 }}>
        <button onClick={() => setSelectedDemo('MainDemo')}>Main Demo</button>
        {/* <button onClick={() => setSelectedDemo('UiGenDemo')}>UI Gen Demo</button> */}
        {/* <button onClick={() => setSelectedDemo('ChatDemo')}>Chat Demo</button> */}
      </nav>
      {renderDemo()}
    </div >
  )
}

export default App
