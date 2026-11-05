import React, { useRef, useState } from 'react';
import { InventoryItem } from '@/types/household';
import InventoryCard from './InventoryCard';
import { cn } from '@/lib/utils';

interface DraggableInventoryCardProps {
  item: InventoryItem;
  onDragStart: (item: InventoryItem) => void;
  onDragEnd: () => void;
  onDrop: (targetItem: InventoryItem) => void;
  isDragging: boolean;
  isDropTarget: boolean;
}

const DraggableInventoryCard: React.FC<DraggableInventoryCardProps> = ({
  item,
  onDragStart,
  onDragEnd,
  onDrop,
  isDragging,
  isDropTarget,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    onDragStart(item);
    
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
    setIsDragOver(false);
    onDragEnd();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragging) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isDragging) {
      onDrop(item);
    }
  };

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200 overflow-hidden",
        isDragging && "opacity-50 scale-95",
        isDragOver && !isDragging && "ring-2 ring-primary ring-offset-2 scale-[1.02]",
        isDropTarget && "ring-2 ring-primary/50"
      )}
    >
      <InventoryCard item={item} />
    </div>
  );
};

export default DraggableInventoryCard;
