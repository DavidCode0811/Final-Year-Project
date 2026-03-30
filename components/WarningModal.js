'use client';

import { TriangleAlert as AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

export function WarningModal({ isOpen, title, message, onDismiss }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        {onDismiss && (
          <Button onClick={onDismiss} className="w-full">
            I Understand
          </Button>
        )}
      </div>
    </div>
  );
}
