import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A prompt, not a push: opened only from an explicit button elsewhere
 * (home.tsx), never auto-shown. Phone number is opt-in and clearly
 * optional — text notification only happens if they add one.
 */
export function WaitlistDialog({ open, onOpenChange }: WaitlistDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setEmail('');
    setPhone('');
    setDone(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error === 'invalid_email'
            ? 'That email doesn’t look right.'
            : data?.error === 'invalid_phone'
              ? 'That phone number doesn’t look right.'
              : 'Could not join the waitlist right now — try again shortly.';
        toast({ title: 'Something went wrong', description: message, variant: 'destructive' });
        return;
      }
      setDone(true);
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Could not reach the server — check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Mail className="h-8 w-8 text-primary" />
            <DialogTitle>You&apos;re on the list</DialogTitle>
            <p className="text-sm text-muted-foreground">
              We&apos;ll be in touch when we launch. Thanks for the early interest.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2 w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Join the waitlist</DialogTitle>
              <DialogDescription className="text-left">
                We&apos;re still connecting things up behind the scenes — nothing beyond this
                signup is stored to the cloud yet, until everything&apos;s properly wired up (or
                we&apos;ve got the funds to launch it right). Leave your email to hear when that
                changes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label htmlFor="waitlist-email" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Email
              </label>
              <Input
                id="waitlist-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="waitlist-phone" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Phone <span className="normal-case font-normal text-muted-foreground/70">(optional — for a text too)</span>
              </label>
              <Input
                id="waitlist-phone"
                type="tel"
                autoComplete="tel"
                placeholder="Totally up to you"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Completely optional. Add it only if you&apos;d also like a text — email alone works fine.
              </p>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submitting || !email} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Join waitlist
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
