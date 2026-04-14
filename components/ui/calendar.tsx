'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_50px_-38px_rgba(15,23,42,0.45)] backdrop-blur-sm',
        className
      )}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'relative flex items-center justify-center px-8 pt-1',
        caption_label: 'text-sm font-semibold tracking-wide text-slate-900',
        nav: 'flex items-center gap-1',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-8 w-8 rounded-xl border-slate-200 bg-white p-0 text-slate-600 opacity-100 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'w-10 rounded-md text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-slate-400',
        row: 'mt-2 flex w-full',
        cell: 'relative h-10 w-10 p-0 text-center text-sm [&:has([aria-selected].day-range-end)]:rounded-r-2xl [&:has([aria-selected].day-outside)]:bg-slate-100 [&:has([aria-selected])]:bg-sky-50 first:[&:has([aria-selected])]:rounded-l-2xl last:[&:has([aria-selected])]:rounded-r-2xl focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-10 w-10 rounded-2xl p-0 font-medium text-slate-700 aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white focus:bg-slate-950 focus:text-white',
        day_today: 'border border-sky-200 bg-sky-50 text-sky-700',
        day_outside:
          'day-outside text-slate-300 opacity-80 aria-selected:bg-slate-100 aria-selected:text-slate-400',
        day_disabled: 'text-slate-300 opacity-50',
        day_range_middle:
          'aria-selected:bg-sky-100 aria-selected:text-slate-900',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
