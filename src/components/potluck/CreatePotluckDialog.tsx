import React, { useState } from 'react';
import { usePotlucks } from '@/hooks/usePotlucks';
import { DEFAULT_CATEGORY_LIMITS, POTLUCK_CATEGORIES, PotluckCategory } from '@/types/potluck';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Loader2, MapPin, Globe, Clock, ChevronDown, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreatePotluckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_OPTIONS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
];

const CreatePotluckDialog: React.FC<CreatePotluckDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { createPotluck } = usePotlucks();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: undefined as Date | undefined,
    event_time: '',
    location: '',
    is_public: true,
    category_limits: { ...DEFAULT_CATEGORY_LIMITS } as Record<string, number>,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) return;

    setIsSubmitting(true);
    try {
      const result = await createPotluck({
        title: formData.title,
        description: formData.description || undefined,
        event_date: formData.event_date.toISOString(),
        event_time: formData.event_time || undefined,
        location: formData.location || undefined,
        is_public: formData.is_public,
        category_limits: formData.category_limits,
      });

      if (result) {
        setFormData({
          title: '',
          description: '',
          event_date: undefined,
          event_time: '',
          location: '',
          is_public: true,
          category_limits: { ...DEFAULT_CATEGORY_LIMITS },
        });
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLimit = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      category_limits: { ...prev.category_limits, [category]: Math.max(0, value) },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-background/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Initialize Potluck</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              placeholder="Summer BBQ, Holiday Dinner..."
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="rounded-xl bg-muted/30"
              required
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl bg-muted/30",
                      !formData.event_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.event_date ? format(formData.event_date, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.event_date}
                    onSelect={date => setFormData(prev => ({ ...prev, event_date: date }))}
                    disabled={date => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl bg-muted/30",
                      !formData.event_time && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {formData.event_time || "Time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-2 rounded-xl max-h-48 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {TIME_OPTIONS.map(time => (
                      <button
                        key={time}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors",
                          formData.event_time === time
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                        onClick={() => setFormData(prev => ({ ...prev, event_time: time }))}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="123 Main St, Backyard..."
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="rounded-xl bg-muted/30 pl-10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's the occasion?"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="rounded-xl bg-muted/30 resize-none"
              rows={2}
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Public Potluck</p>
                <p className="text-xs text-muted-foreground">
                  Anyone with the link can view & claim items
                </p>
              </div>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
          </div>

          {/* Category Limits */}
          <Collapsible open={showLimits} onOpenChange={setShowLimits}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Category Limits</p>
                    <p className="text-xs text-muted-foreground">
                      Set max items per category
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showLimits && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2">
                {POTLUCK_CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-muted/10">
                    <span className="text-xs text-muted-foreground">{cat}</span>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={formData.category_limits[cat] ?? 0}
                      onChange={e => updateLimit(cat, parseInt(e.target.value) || 0)}
                      className="w-14 h-7 text-xs text-center rounded-lg"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Set to 0 for unlimited
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full rounded-xl h-12"
            disabled={isSubmitting || !formData.title || !formData.event_date}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Potluck'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePotluckDialog;
