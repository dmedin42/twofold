import React, { useMemo, useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InventoryItem } from '@/types/household';
import { normalizeUnit, convertUnits, areUnitsCompatible, standardizeItemName } from '@/lib/atomicUnits';
import { Merge, AlertTriangle, Snowflake, Pencil } from 'lucide-react';

interface MergeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem: InventoryItem | null;
  targetItem: InventoryItem | null;
  onConfirm: (standardizedName: string, totalQuantity: number, finalUnit: string) => void;
}

const MergeConfirmDialog: React.FC<MergeConfirmDialogProps> = ({
  open,
  onOpenChange,
  sourceItem,
  targetItem,
  onConfirm,
}) => {
  const [editedName, setEditedName] = useState('');
  const mergeInfo = useMemo(() => {
    if (!sourceItem || !targetItem) return null;

    const sourceNormUnit = normalizeUnit(sourceItem.unit);
    const targetNormUnit = normalizeUnit(targetItem.unit);
    const unitsCompatible = areUnitsCompatible(sourceItem.unit, targetItem.unit);
    
    // Calculate merged quantity
    let totalQuantity: number;
    let finalUnit: string;
    
    if (sourceNormUnit === targetNormUnit) {
      // Same units - simple addition
      totalQuantity = sourceItem.quantity + targetItem.quantity;
      finalUnit = targetItem.unit;
    } else if (unitsCompatible) {
      // Compatible units - convert source to target
      const converted = convertUnits(sourceItem.quantity, sourceItem.unit, targetItem.unit);
      if (converted !== null) {
        totalQuantity = targetItem.quantity + converted;
        finalUnit = targetItem.unit;
      } else {
        // Fallback - keep separate
        totalQuantity = targetItem.quantity;
        finalUnit = targetItem.unit;
      }
    } else {
      // Incompatible units - use count
      totalQuantity = sourceItem.quantity + targetItem.quantity;
      finalUnit = 'count';
    }

    // Standardize the name
    const sourceName = standardizeItemName(sourceItem.name);
    const targetName = standardizeItemName(targetItem.name);
    const namesMatch = sourceName.toLowerCase() === targetName.toLowerCase();
    const standardizedName = namesMatch ? targetItem.name : targetName;

    return {
      sourceName: sourceItem.name,
      targetName: targetItem.name,
      standardizedName,
      namesMatch,
      sourceQty: sourceItem.quantity,
      targetQty: targetItem.quantity,
      sourceUnit: sourceItem.unit,
      targetUnit: targetItem.unit,
      totalQuantity: Math.round(totalQuantity * 100) / 100,
      finalUnit,
      unitsCompatible,
      sourceIsFrozen: sourceItem.isFrozen,
      targetIsFrozen: targetItem.isFrozen,
    };
  }, [sourceItem, targetItem]);

  // Update edited name when mergeInfo changes
  useEffect(() => {
    if (mergeInfo) {
      setEditedName(mergeInfo.standardizedName);
    }
  }, [mergeInfo]);

  if (!mergeInfo) return null;

  const handleConfirm = () => {
    const finalName = editedName.trim() || mergeInfo.standardizedName;
    onConfirm(finalName, mergeInfo.totalQuantity, mergeInfo.finalUnit);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-[90vw] sm:max-w-lg rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-primary" />
            Merge Inventory Items
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {!mergeInfo.namesMatch && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Different item names detected</p>
                    <p className="text-amber-600 dark:text-amber-300">
                      "{mergeInfo.sourceName}" and "{mergeInfo.targetName}" will be combined into "{mergeInfo.standardizedName}".
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Source</p>
                  <p className="font-medium text-foreground flex items-center justify-center gap-1">
                    {mergeInfo.sourceQty} {mergeInfo.sourceUnit}
                    {mergeInfo.sourceIsFrozen && <Snowflake className="w-3 h-3 text-sky-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{mergeInfo.sourceName}</p>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-2xl text-muted-foreground">+</span>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Target</p>
                  <p className="font-medium text-foreground flex items-center justify-center gap-1">
                    {mergeInfo.targetQty} {mergeInfo.targetUnit}
                    {mergeInfo.targetIsFrozen && <Snowflake className="w-3 h-3 text-sky-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{mergeInfo.targetName}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10">
                <p className="text-xs text-muted-foreground mb-1 text-center">Result</p>
                <p className="text-lg font-semibold text-primary text-center">
                  {mergeInfo.totalQuantity} {mergeInfo.finalUnit}
                </p>
                <div className="mt-3">
                  <Label htmlFor="merged-name" className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Pencil className="w-3 h-3" />
                    Item Name
                  </Label>
                  <Input
                    id="merged-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-9 text-center font-medium"
                    placeholder="Enter item name"
                  />
                </div>
              </div>

              {!mergeInfo.unitsCompatible && (
                <p className="text-xs text-muted-foreground text-center">
                  Note: Units are not compatible for conversion. Quantities will be added directly.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
            <Merge className="w-4 h-4 mr-2" />
            Merge Items
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MergeConfirmDialog;
