import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Loader2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChefAssistantProps {
  recipe: any;
  onClose?: () => void;
}

export const ChefAssistant = ({ recipe, onClose }: ChefAssistantProps) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your sous chef. Ask me about substitutions, fixes, or clarifications!"
    }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, your browser doesn't support voice input. Try typing instead!"
      }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleAsk(transcript);
    };
    recognition.start();
  };

  const handleAsk = async (text: string) => {
    const query = text || input;
    if (!query.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke('substitution-chat', {
        body: { 
          message: query, 
          recipeContext: {
            name: recipe?.name,
            ingredients: recipe?.ingredients,
            instructions: recipe?.instructions
          }
        }
      });
      
      if (error) throw error;
      
      // Add assistant reply
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "I'm not sure how to help with that. Try asking about ingredient substitutions!"
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Chef is a bit confused right now. Try again in a moment?"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk('');
    }
  };

  // Collapsed state - just a floating button
  if (!isExpanded) {
    return (
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-elevated bg-primary hover:bg-primary/90"
        >
          <ChefHat className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[60vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Sous Chef</h3>
              <p className="text-[10px] text-muted-foreground">Ask for help</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={() => {
              setIsExpanded(false);
              onClose?.();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[300px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-background">
          <div className="flex items-center gap-2">
            <Button 
              variant={isListening ? "destructive" : "outline"} 
              size="icon" 
              onClick={toggleListening}
              className="shrink-0 h-10 w-10 rounded-full"
              disabled={isLoading}
            >
              <Mic className={cn("w-4 h-4", isListening && "animate-pulse")} />
            </Button>
            <Input 
              placeholder="Ask about substitutions..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={handleKeyDown}
              className="flex-1 h-10 rounded-full bg-muted border-0"
              disabled={isLoading}
            />
            <Button 
              onClick={() => handleAsk('')} 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
