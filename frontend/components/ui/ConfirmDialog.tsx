'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from './Dialog';

export function ConfirmDialog({
                                  open,
                                  onOpenChange,
                                  title,
                                  description,
                                  confirmLabel = 'Confirm',
                                  danger = false,
                                  onConfirm,
                              }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
                <div className="mt-6 flex justify-end gap-2">
                    <DialogClose asChild>
                        <button className="btn-secondary">Cancel</button>
                    </DialogClose>
                    <button
                        className={danger ? 'btn-primary bg-error hover:bg-error active:bg-error/90' : 'btn-primary'}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}