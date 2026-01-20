import { useState, useEffect } from 'react'
import './App.css'

import { ChatInterface } from './components/chat/ChatInterface'
import { TransformDemo } from './components/demo/TransformDemo'
import { GenUIProvider } from './lib/genui-sdk'

function App() {
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <GenUIProvider apiKey="fog_live_b759a72546b7cd0c35622661b0f2c7eb">
      {route === '#/demo' ? <TransformDemo /> : <ChatInterface />}
    </GenUIProvider>
  )
}

export default App
