"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KEYBOARD_SHORTCUTS } from "@/lib/element-actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Works when you are not typing in a text field.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          {KEYBOARD_SHORTCUTS.map(({ keys, action }) => (
            <div key={keys} className="flex items-start justify-between gap-4">
              <dt className="shrink-0 rounded border bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
                {keys}
              </dt>
              <dd className="text-right text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
