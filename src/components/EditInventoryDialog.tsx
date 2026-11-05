import React, { useState, useEffect } from 'react';
import { InventoryItem } from '@/types/household';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, Package, Save, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';

// Default "opened" shelf life reductions by category (in days)
const OPENED_SHELF_LIFE: Record<string, number> = {
  Dairy: 7,
  Meat: 3,
  Produce: 5,
  Beverages: 5,
  Bakery: 3,
  Frozen: 14, // If thawed and opened
  Pantry: 30,
  Snacks: 14,
};

interface EditInventoryDialogProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    updates: {
      quantity?: number;
      expiryDate?: string;
      isOpened?: boolean;
    }
  ) => void;
  category?: string;
}

const EditInventoryDialog: React.FC<EditInventoryDialogProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  category = 'Pantry',
}) => {
  const [quantity, setQuantity] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [originalExpiryDate, setOriginalExpiryDate] = useState<string>('');

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setExpiryDate(item.expiryDate);
      setOriginalExpiryDate(item.expiryDate);
      // Check if item was already opened (stored in the item or inferred)
      setIsOpened(false); // Reset - we don't persist "opened" status yet in DB
    }
  }, [item]);

  const handleOpenedToggle = (checked: boolean) => {
    setIsOpened(checked);

    if (checked) {
      // Reduce expiry date based on category's "opened" shelf life
      const openedDays = OPENED_SHELF_LIFE[category] || 7;
      const today = new Date();
      const currentExpiry = new Date(expiryDate);
      const daysRemaining = Math.ceil(
        (currentExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only reduce if current expiry is further out than opened shelf life
      if (daysRemaining > openedDays) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + openedDays);
        setExpiryDate(newExpiry.toISOString().split('T')[0]);
        toast.info(`Expiry adjusted to ${openedDays} days (opened ${category})`);
      }
    } else {
      // Restore original expiry if unchecking
      setExpiryDate(originalExpiryDate);
    }
  };

  const handleSave = () => {
    if (!item) return;

    onSave(item.id, {
      quantity,
      expiryDate,
      isOpened,
    });

    toast.success('Item updated');
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Edit {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Quantity
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min={0}
                step={0.5}
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-16">
                {item.unit}
              </span>
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Expiry Date
            </Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={isOpened} // Can't manually change if opened logic applied
            />
          </div>

          {/* Opened Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <DoorOpen className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">Opened</p>
                <p className="text-xs text-muted-foreground">
                  Reduces shelf life to {OPENED_SHELF_LIFE[category] || 7} days
                </p>
              </div>
            </div>
            <Switch
              checked={isOpened}
              onCheckedChange={handleOpenedToggle}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditInventoryDialog;
