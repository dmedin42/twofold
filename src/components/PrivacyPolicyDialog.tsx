import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PrivacyPolicyDialogProps {
  children: React.ReactNode;
}

const PrivacyPolicyDialog: React.FC<PrivacyPolicyDialogProps> = ({ children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Twofold Privacy Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-6">
          <div className="space-y-8 text-sm leading-relaxed">
            <header>
              <p className="text-xs text-muted-foreground">
                Effective Date: February 3, 2026
              </p>
              <p className="mt-4 text-muted-foreground">
                This Privacy Notice describes how and why <strong className="text-foreground">Twofold (KitchenOS)</strong> might collect, store, and use your information when you use our services, including our mobile and web applications.
              </p>
            </header>

            <section className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">1. Information We Collect</h3>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  <strong className="text-foreground block mb-1">Personal Data:</strong> We collect names and email addresses voluntarily provided during account creation to manage your kitchen and sync with household partners.
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground block mb-1">Kitchen & Inventory Data:</strong> We store specific food items, quantities, units, and purchase dates to provide "Rescue" features and expiration tracking.
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground block mb-1">Device Access & Media:</strong> To enable receipt scanning and recipe digitization, we request access to your device’s <strong className="text-foreground">camera</strong> and <strong className="text-foreground">photo library</strong>. We also automatically collect device identifiers and system configuration for security and troubleshooting.
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground block mb-1">Google API Data:</strong> Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" className="text-primary hover:underline">Google API Services User Data Policy</a>, including Limited Use requirements.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">2. Artificial Intelligence (AI) Usage</h3>
              <p className="text-muted-foreground">
                We use AI technologies (including Google Cloud AI and Gemini) to provide:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong className="text-foreground">Image Analysis:</strong> Extracting text from grocery receipts and handwritten recipe cards.</li>
                <li><strong className="text-foreground">Text Analysis:</strong> Generating meal suggestions and identifying food types.</li>
                <li><strong className="text-foreground">Automation:</strong> Categorizing inventory based on SKU data.</li>
              </ul>
              <p className="text-xs text-muted-foreground italic">
                Your data is processed by these AI providers only to fulfill the functions of the Services. We do not use your personal information to train third-party AI models.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">3. Data Sharing & Anonymization</h3>
              <p className="text-muted-foreground">
                Twofold is a collaborative household application. Data is shared in the following ways:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Household Sync:</strong> Inventory added by one profile is visible to all authenticated members of that specific household.</li>
                <li><strong className="text-foreground">Account Deletion & Anonymization:</strong> If you delete your account, your personal profile (name/email) is erased from our active databases. However, to maintain the integrity of the Shared Household, food items or recipes you added remain in the household but are <strong className="text-foreground underline decoration-primary">anonymized</strong>, meaning they are no longer linked to your identity.</li>
                <li><strong className="text-foreground">Business Transfers:</strong> We may share data during negotiations of any merger or sale of company assets.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">4. Retention & Security</h3>
              <p className="text-muted-foreground">
                We keep your personal information for as long as necessary to fulfill the purposes outlined here. For terminated accounts, we may retain anonymized data in backup archives for up to <strong className="text-foreground">two (2) months</strong> before final deletion. 
              </p>
              <p className="text-muted-foreground">
                We aim to protect your data through a system of organizational and technical security measures; however, no electronic transmission can be guaranteed 100% secure.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">5. Your Privacy Rights</h3>
              <p className="text-muted-foreground">
                Depending on your location (including CA, CO, CT, VA, or regions like Australia and the EU), you have specific rights:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>The right to <strong className="text-foreground">access, correct, or delete</strong> your personal data.</li>
                <li>The right to <strong className="text-foreground">withdraw consent</strong> for data processing.</li>
                <li>The right to <strong className="text-foreground">opt-out</strong> of targeted advertising or profiling.</li>
              </ul>
              <p className="text-muted-foreground">
                You can exercise these rights directly through the App Settings or by contacting us.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">6. Contact & Appeals</h3>
              <p className="text-muted-foreground">
                If you have questions, concerns, or wish to appeal a decision regarding your data, please contact:
              </p>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">Twofold - KitchenOS</p>
                <p>Email: <a href="mailto:david@twofold.com" className="text-primary hover:underline">david@twofold.com</a></p>
                <p>
                  LinkedIn:{' '}
                  <a 
                    href="https://www.linkedin.com/in/davidmedina42" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    in/davidmedina42
                  </a>
                </p>
                <p className="text-xs text-muted-foreground mt-2">Eagle Mountain, UT | United States</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyPolicyDialog;