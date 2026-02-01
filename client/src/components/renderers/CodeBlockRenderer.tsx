import { Check, Copy, FileCode, Terminal } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export const CodeBlockRenderer = ({
  code,
  language = 'text',
  filename,
  showLineNumbers = true,
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <Card className="overflow-hidden bg-slate-950 text-slate-50 border-slate-800">
      {/* Header with filename and language */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {filename ? (
            <FileCode className="h-4 w-4" />
          ) : (
            <Terminal className="h-4 w-4" />
          )}
          <span className="font-medium text-slate-300">
            {filename || language}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className="table-row">
              {showLineNumbers && (
                <span className="table-cell select-none text-right pr-4 text-slate-600 w-8">
                  {i + 1}
                </span>
              )}
              <span className="table-cell whitespace-pre">{line}</span>
            </div>
          ))}
        </pre>
      </div>
    </Card>
  );
};
