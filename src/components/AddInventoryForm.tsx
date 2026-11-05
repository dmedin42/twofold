import React, { useState } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useGeminiChef } from '@/hooks/useGeminiChef';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CalendarIcon, Sparkles, Loader2, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const categories = ['Dairy', 'Produce', 'Bakery', 'Snacks', 'Pantry', 'Meat', 'Frozen', 'Beverages'];
const units = ['item', 'lb', 'oz', 'kg', 'g', 'L', 'ml', 'dozen', 'pack'];

const AddInventoryForm: React.FC = () => {
  const { activeUser, addInventoryItem } = useHousehold();
  const { predictShelfLife, isLoading } = useGeminiChef();
  
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('item');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category || isAdding) return;
    
    setIsAdding(true);

    let finalExpiryDate = expiryDate;

    // If no expiry date provided, use AI to predict
    if (!finalExpiryDate) {
      setIsPredicting(true);
      try {
        const prediction = await predictShelfLife(name.trim(), category);
        if (prediction?.daysUntilExpiry) {
          const predictedDate = new Date();
          predictedDate.setDate(predictedDate.getDate() + prediction.daysUntilExpiry);
          finalExpiryDate = predictedDate;
          toast.success(`AI predicted shelf life: ~${prediction.daysUntilExpiry} days`, {
            description: prediction.reasoning,
          });
        } else {
          // Fallback to 7 days if AI fails
          const fallbackDate = new Date();
          fallbackDate.setDate(fallbackDate.getDate() + 7);
          finalExpiryDate = fallbackDate;
          toast.info('Using default 7-day expiry');
        }
      } catch (error) {
        // Fallback to 7 days on error
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + 7);
        finalExpiryDate = fallbackDate;
        toast.info('Using default 7-day expiry');
      } finally {
        setIsPredicting(false);
      }
    }

    try {
      await addInventoryItem({
        name: name.trim(),
        category,
        quantity: parseInt(quantity) || 1,
        unit,
        expiryDate: finalExpiryDate.toISOString().split('T')[0],
        ownerUid: isPrivate ? (activeUser?.uid || 'global') : 'global',
        lastBoughtByUid: activeUser?.uid || 'global',
        isPrivate,
      });

      // Reset form
      setName('');
      setCategory('');
      setQuantity('1');
      setUnit('item');
      setExpiryDate(undefined);
      setIsPrivate(false);
      setIsOpen(false);
      
      toast.success('Item added to inventory!');
    } finally {
      setIsAdding(false);
    }
  };

  const isSubmitting = isLoading || isPredicting || isAdding;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between rounded-xl h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all",
            isOpen && "border-primary bg-primary/5"
          )}
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item Manually
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="animate-in slide-in-from-top-2 duration-200">
        <form onSubmit={handleSubmit} className="mt-3 p-4 bg-card rounded-2xl border border-border shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground text-sm">New Item</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Item Name */}
            <Input
              placeholder="Item name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 bg-muted border-0 h-10"
              required
            />

            {/* Category */}
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="bg-muted border-0 h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quantity + Unit */}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-16 bg-muted border-0 text-center h-10"
                min="1"
              />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="flex-1 bg-muted border-0 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expiry Date (Optional) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-2 justify-start text-left font-normal bg-muted border-0 h-10",
                    !expiryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : "Expiry (optional - AI predicts)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Private Toggle */}
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-muted-foreground"
              />
              Mark as private
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full rounded-xl h-10 gap-2" 
            disabled={!name.trim() || !category || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {!expiryDate ? 'Predicting...' : 'Adding...'}
              </>
            ) : (
              <>
                {!expiryDate && <Sparkles className="w-4 h-4" />}
                Add to Pantry
              </>
            )}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AddInventoryForm;
