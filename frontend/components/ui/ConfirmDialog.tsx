'use client';

import {cn} from '@/lib/utils';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from './Dialog';

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
    onConfirm: () => void | Promise<void>;
}) {
    async function handleConfirm() {
        await onConfirm();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>

                <DialogDescription>
                    {description}
                </DialogDescription>

                <div className="mt-6 flex justify-end gap-2">
                    <DialogClose asChild>
                        <button type="button" className="btn-secondary">
                            Cancel
                        </button>
                    </DialogClose>

                    <button
                        type="button"
                        className={cn(
                            danger ? 'btn-danger' : 'btn-primary',
                        )}
                        onClick={handleConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}