import React from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'OK',
    cancelLabel = 'Скасувати'
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
            onClick={onCancel}
        >
            <Card
                className="w-full max-w-sm flex flex-col p-6 space-y-6 bg-[#181a1d] border border-white/10 shadow-2xl animate-scaleIn cursor-default"
                glass={false}
                noAnimate
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-2 text-center">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-sm text-hint leading-relaxed">{message}</p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <Button
                        className="w-full py-3.5 font-bold shadow-lg shadow-primary/20"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                    <Button
                        variant="secondary"
                        className="w-full py-3 text-sm font-medium opacity-80"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </Button>
                </div>
            </Card>
        </div>,
        document.body
    );
};
