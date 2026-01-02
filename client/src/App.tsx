import './App.css'

import { ChatInterface } from './components/chat/ChatInterface'
import { GenUIProvider } from './lib/genui-sdk'

function App() {
  return (
    <GenUIProvider>
      <ChatInterface />
    </GenUIProvider>
  )
}

export default App
