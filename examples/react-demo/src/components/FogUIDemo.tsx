import { FogUIProvider, FogUIRenderer } from '@fogui/react';
import type { FogUIResponse } from '@fogui/react';
import { useState } from 'react';
import { demoAdapter } from '../fogui.adapter';

// Mock API responses for the demo
const exampleResponses: Record<string, FogUIResponse> = {
  Card: {
    thinking: [],
    content: [{
      type: 'component',
      componentType: 'Card',
      props: {
        title: 'Welcome to FogUI',
        description: 'This is a demo of the Card component.',
      },
      children: [
        { type: 'text', value: 'You can render any component from the canonical schema.' }
      ]
    }]
  },
  Table: {
    thinking: [],
    content: [{
        type: 'component',
        componentType: 'Table',
        props: {
            headers: ['Name', 'Role', 'Status'],
            rows: [
                ['John Doe', 'Admin', 'Active'],
                ['Jane Smith', 'User', 'Inactive'],
            ]
        }
    }]
  },
  List: {
      thinking: [],
      content: [{
          type: 'component',
          componentType: 'List',
          props: {
              ordered: true,
              items: ['First item', 'Second item', 'Third item']
          }
      }]
  }
};

function FogUIDemoContent() {
  const [activeExample, setActiveExample] = useState<string>('Card');

  const response = exampleResponses[activeExample];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>FogUI Demo</h1>
      <p>This demo showcases the FogUI renderer with a basic, unstyled adapter.</p>
      
      <div style={{ marginBottom: '16px' }}>
        <h3>Select a Demo Component:</h3>
        {Object.keys(exampleResponses).map(key => (
          <button 
            key={key} 
            onClick={() => setActiveExample(key)}
            style={{ 
              padding: '8px 12px', 
              margin: '0 4px', 
              background: activeExample === key ? '#007bff' : '#eee',
              color: activeExample === key ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px' }}>
        <FogUIRenderer response={response} />
      </div>

      <div style={{ marginTop: '16px', background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
        <h4>Response JSON:</h4>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function FogUIDemo() {
  // The provider would typically wrap your whole app
  return (
    <FogUIProvider 
      adapter={demoAdapter}
      // No endpoint needed for this static demo
    >
      <FogUIDemoContent />
    </FogUIProvider>
  );
}
