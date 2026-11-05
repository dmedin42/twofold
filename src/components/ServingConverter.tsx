import React, { useState } from 'react';
import { Scale, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ServingConverter: React.FC = () => {
  const [originalServings, setOriginalServings] = useState<number>(4);
  const [targetServings, setTargetServings] = useState<number>(2);

  const factor = originalServings > 0 ? targetServings / originalServings : 0;

  return (
    <div className="bg-card rounded-3xl border border-border p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scale className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Measurement Converter</h3>
          <p className="text-xs text-muted-foreground">Scale recipe servings</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Original Yield
          </Label>
          <Input
            type="number"
            min={1}
            value={originalServings}
            onChange={(e) => setOriginalServings(Number(e.target.value) || 1)}
            className="mt-1.5 rounded-xl border-border"
            placeholder="4"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Target Yield
          </Label>
          <Input
            type="number"
            min={1}
            value={targetServings}
            onChange={(e) => setTargetServings(Number(e.target.value) || 1)}
            className="mt-1.5 rounded-xl border-border"
            placeholder="2"
          />
        </div>

        <div className="bg-secondary/10 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Multiply all ingredients by</p>
          <p className="font-display text-2xl font-semibold text-secondary">
            Factor: {factor.toFixed(2)}x
          </p>
        </div>

        {/* Example Conversions */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Example</p>
          <div className="space-y-2">
            {[
              { name: "1 cup flour", original: 1 },
              { name: "2 tbsp sugar", original: 2 },
              { name: "½ tsp salt", original: 0.5 },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {(item.original * factor).toFixed(2).replace(/\.?0+$/, '')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServingConverter;
