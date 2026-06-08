declare module 'ad-bs-converter' {
  export interface GregorianDateResult {
    year: number;
    month: number;
    day: number;
    strMonth: string;
    strShortMonth: string;
    dayOfWeek: number;
    strDayOfWeek: string;
    strShortDayOfWeek: string;
  }

  export interface NepaliDateResult {
    year: {
      year: string | number;
    } | number;
    month: {
      month: string | number;
    } | number;
    day: {
      day: string | number;
    } | number;
    en: {
      year: number;
      month: number;
      day: number;
      strMonth: string;
      strShortMonth: string;
      dayOfWeek: number;
      strDayOfWeek: string;
      strShortDayOfWeek: string;
      strMinDayOfWeek: string;
      totalDaysInMonth: string;
    };
    ne: {
      year: string;
      month: string;
      day: string;
      strMonth: string;
      strShortMonth: string;
      dayOfWeek: string;
      strDayOfWeek: string;
      strShortDayOfWeek: string;
      strMinDayOfWeek: string;
      totalDaysInMonth: string;
    };
  }

  export function ad2bs(date: string): NepaliDateResult;
  export function bs2ad(date: string): GregorianDateResult;

  const adbs: {
    ad2bs: typeof ad2bs;
    bs2ad: typeof bs2ad;
  };

  export default adbs;
}