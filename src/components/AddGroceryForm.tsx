import React, { useState } from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const AddGroceryForm: React.FC = () => {
  const { activeUser, addToGroceryList } = useHousehold();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeUser) return;

    addToGroceryList({
      name: name.trim(),
      quantity: parseInt(quantity) || 1,
      unit: unit.trim() || 'item',
      addedByUid: activeUser.uid,
    });

    setName('');
    setQuantity('1');
    setUnit('');
  };

  if (!activeUser) return null;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-card rounded-2xl border border-border shadow-soft">
      <Input
        placeholder="Add item..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 bg-muted border-0"
      />
      <Input
        type="number"
        placeholder="Qty"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-16 bg-muted border-0 text-center"
        min="1"
      />
      <Input
        placeholder="Unit"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="w-20 bg-muted border-0"
      />
      <Button type="submit" size="icon" className="rounded-xl">
        <Plus className="w-5 h-5" />
      </Button>
    </form>
  );
};

export default AddGroceryForm;
