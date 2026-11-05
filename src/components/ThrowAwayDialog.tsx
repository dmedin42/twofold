import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InventoryItem } from '@/types/household';
import { cn } from '@/lib/utils';
import { Trash2, Calendar, AlertCircle, Package, HelpCircle } from 'lucide-react';

interface ThrowAwayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onConfirm: (reason: string) => void;
}

const wasteReasons = [
  { id: 'expired', icon: Calendar, label: 'Expired', description: 'Past its date' },
  { id: 'spoiled', icon: AlertCircle, label: 'Spoiled', description: 'Gone bad early' },
  { id: 'overbought', icon: Package, label: 'Too Much', description: 'Bought more than needed' },
  { id: 'forgot', icon: HelpCircle, label: 'Forgot', description: 'Lost in the back' },
];

const ThrowAwayDialog: React.FC<ThrowAwayDialogProps> = ({
  open,
  onOpenChange,
  item,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState('expired');

  if (!item) return null;

  const handleConfirm = () => {
    onConfirm(selectedReason);
    setSelectedReason('expired'); // Reset for next time
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md rounded-3xl border-border/50">
        <AlertDialogHeader className="text-center sm:text-center">
          {/* Icon */}
          <div className="mx-auto mb-2 w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-amber-600" />
          </div>
          
          <AlertDialogTitle className="text-xl font-display">
            Throw away {item.name}?
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-muted-foreground">
            This will log it as wasted food to help you reduce waste next time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Item Preview */}
        <div className="my-4 p-3 rounded-2xl bg-muted/50 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center border border-border">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.quantity} {item.unit} · {item.category}
            </p>
          </div>
        </div>

        {/* Reason Selection */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Why are you throwing it away?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {wasteReasons.map((reason) => {
              const Icon = reason.icon;
              return (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={cn(
                    "p-3 rounded-xl text-left transition-all border-2",
                    selectedReason === reason.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className={cn(
                      "w-4 h-4",
                      selectedReason === reason.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="font-medium text-sm text-foreground">{reason.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{reason.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel className="w-full sm:w-auto rounded-xl">
            Keep It
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            className="w-full sm:w-auto rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Throw Away
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ThrowAwayDialog;
