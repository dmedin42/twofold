import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner'; // Updated to use 'sonner' to match your other files

export interface ScannedItem {
name: string;
quantity: number;
unit: string;
category: string;
expiryDate?: string;
}

export const useReceiptScanner = () => {
const [isScanning, setIsScanning] = useState(false);

// Helper: Convert Blob/File to Base64 (stripping the prefix)
const convertToBase64 = (blob: Blob): Promise<string> => {
return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
    const base64data = reader.result as string;
    // Remove "data:image/jpeg;base64," header so we send raw string
    resolve(base64data.split(',')[1]); 
    };
    reader.onerror = reject;
});
};

const scanReceipt = async (photoBlob: Blob): Promise<ScannedItem[] | null> => {
setIsScanning(true);
try {
    // 1. Convert photo
    const base64Image = await convertToBase64(photoBlob);

    // 2. Call 'process-vision' Edge Function
    const { data, error } = await supabase.functions.invoke('process-vision', {
    body: { 
        image: base64Image,
        type: 'groceries', // Tells AI to look for food items specifically
        mimeType: photoBlob.type || 'image/jpeg' 
    }
    });

    if (error) throw error;
    
    const items = data.items || [];

    // 3. Success
    if (items.length > 0) {
    toast.success("Receipt Scanned!", {
        description: `Found ${items.length} items.`
    });
    } else {
    toast.info("Scan Complete", {
        description: "No recognizable food items found."
    });
    }
    
    return items;

} catch (err: any) {
    console.error("Vision Error:", err);
    toast.error("Scan Failed", {
    description: "Could not read the receipt. Try getting closer or better lighting."
    });
    return null;
} finally {
    setIsScanning(false);
}
};

return {
scanReceipt,
isScanning
};
};