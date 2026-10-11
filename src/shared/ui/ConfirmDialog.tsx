import type { ReactNode } from 'react';

import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'seed-design/ui/alert-dialog';

import { Button } from './Button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will happen, in a sentence or two. */
  children: ReactNode;
  /**
   * The choices, most consequential last. Each closes the dialog and then runs `onSelect`.
   * A Cancel button is always added in front.
   */
  actions: readonly { label: string; primary?: boolean; onSelect: () => void }[];
};

/**
 * Modal question with one or more answers and a Cancel. Use it before anything that cannot be
 * undone, or when a save can mean more than one thing.
 * @param props open state, title, explanation and the available actions
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  children,
  actions,
}: ConfirmDialogProps) => (
  <AlertDialogRoot open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{children}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button onClick={() => onOpenChange(false)}>Cancel</Button>
        {actions.map(({ label, primary, onSelect }) => (
          <Button
            key={label}
            variant={primary ? 'primary' : 'secondary'}
            onClick={() => {
              onOpenChange(false);
              onSelect();
            }}
          >
            {label}
          </Button>
        ))}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogRoot>
);
