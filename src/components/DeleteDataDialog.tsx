import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DeleteDataDialog: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteData = async () => {
    if (!user || confirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Get profile ID first before deleting
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Delete household memberships using profile_id
      if (profile) {
        const { error: membershipError } = await (supabase as any)
          .from('household_memberships')
          .delete()
          .eq('profile_id', profile.id);

        if (membershipError) {
          console.error('Error deleting memberships:', membershipError);
        }
      }

      // Delete user's profile (cascade will handle related data via RLS)
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw profileError;
      }

      toast.success('Your data has been deleted');
      
      // Sign out and redirect
      await signOut();
    } catch (error: any) {
      console.error('Error deleting data:', error);
      toast.error('Failed to delete data. Please contact support.');
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete My Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete All Your Data?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action is <strong>permanent and cannot be undone</strong>. 
              All your personal data will be deleted, including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Your profile information</li>
              <li>Household memberships</li>
              <li>Any inventory items you added</li>
              <li>Recipes you created</li>
              <li>Waste tracking history</li>
            </ul>
            <p className="text-sm">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mt-2"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteData}
            disabled={isDeleting || confirmText !== 'DELETE'}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Delete Everything'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDataDialog;
