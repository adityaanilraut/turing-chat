import Layout from './components/Layout';
import MainMenu from './components/MainMenu';
import ChatInterface from './components/ChatInterface';
import useGame from './engine/gameStore';

function App() {
  const { mode } = useGame();

  return (
    <Layout>
      {mode === 'MENU' ? <MainMenu /> : <ChatInterface />}
    </Layout>
  );
}

export default App;
