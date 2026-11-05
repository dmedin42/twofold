import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, ClipboardCheck, Sparkles } from 'lucide-react';

const WelcomeNudgeCard: React.FC = () => {
  return (
    <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Welcome to your new kitchen!</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Start by adding your first items manually or scanning a receipt to see the magic happen.
      </p>
      <div className="flex gap-3">
        <Link to="/inventory" className="flex-1">
          <Button variant="outline" className="w-full gap-2" size="sm">
            <Package className="w-4 h-4" />
            Pantry+
          </Button>
        </Link>
        <Link to="/checkin" className="flex-1">
          <Button className="w-full gap-2" size="sm">
            <ClipboardCheck className="w-4 h-4" />
            Scan Receipt
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default WelcomeNudgeCard;
