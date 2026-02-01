import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils'; // Assuming this utility exists or I should check App.tsx imports

// Fallback utility if not present
function classNames(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface AccordionItem {
  title: string;
  content: string;
  isOpen?: boolean;
}

interface AccordionRendererProps {
  items: AccordionItem[];
  variant?: 'default' | 'separated' | 'board';
}

export const AccordionRenderer = ({
  items,
  variant = 'default',
}: AccordionRendererProps) => {
  // Track open state for each item (multi-select allowed)
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  if (variant === 'board') {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
           <Card key={i} className="p-4">
             <h3 className="font-semibold mb-2">{item.title}</h3>
             <p className="text-sm text-gray-600">{item.content}</p>
           </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={classNames("w-full space-y-2", variant === 'separated' ? "space-y-4" : "")}>
      {items.map((item, i) => {
        const isOpen = openItems.has(i);
        return (
          <Card 
            key={i} 
            className={classNames(
              "overflow-hidden transition-all duration-200",
              isOpen ? "ring-1 ring-blue-200" : ""
            )}
          >
            <button
              onClick={() => toggleItem(i)}
              className="flex w-full items-center justify-between p-4 text-left font-medium transition-colors hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-900">
                {item.title}
              </span>
              <ChevronDown
                className={classNames(
                  "h-4 w-4 text-slate-500 transition-transform duration-200",
                  isOpen ? "rotate-180" : ""
                )}
              />
            </button>
            
            {/* 
              Using max-height assumption for simple CSS animation, 
              or just conditional rendering for simplicity and performance 
            */}
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                {item.content}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
