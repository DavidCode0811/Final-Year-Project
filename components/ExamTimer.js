'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function ExamTimer({ duration, onTimeUp }) {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);

  useEffect(() => {
    if (timeRemaining <= 0) {
      if (onTimeUp) {
        onTimeUp();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const isWarning = timeRemaining <= 300;
  const isDanger = timeRemaining <= 60;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
        isDanger
          ? 'bg-red-100 text-red-700'
          : isWarning
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      <Clock className="w-5 h-5" />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
