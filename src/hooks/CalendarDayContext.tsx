import { createContext, useContext, type ReactNode } from 'react';
import { useCalendarDay } from './useCalendarDay';

const CalendarDayContext = createContext<string>('');

/** Provides a live calendar day so relative due labels refresh overnight. */
export function CalendarDayProvider({ children }: { children: ReactNode }) {
  const day = useCalendarDay();
  return <CalendarDayContext.Provider value={day}>{children}</CalendarDayContext.Provider>;
}

export function useLiveCalendarDay(): string {
  return useContext(CalendarDayContext);
}
