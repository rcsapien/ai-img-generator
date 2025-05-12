import React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black opacity-40" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  );
};
