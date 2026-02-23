import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { ChatPanel } from '@/components/ChatPanel';

const Chat = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h1 className="text-lg font-bold">Chat Petugas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-24 max-w-4xl mx-auto">
        <ChatPanel />
      </main>
    </div>
  );
};

export default Chat;
