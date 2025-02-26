interface NBPResponse {
  table: string;
  currency: string;
  code: string;
  rates: Array<{
    effectiveDate: string;
    mid: number;
  }>;
}

const CACHE_PREFIX = 'nbp_rate_';

export function getPreviousWorkingDay(date: string): string {
  const d = new Date(date);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  
  return d.toISOString().split('T')[0];
}

export async function getExchangeRate(date: string): Promise<number | null> {
  // Check cache first
  const cacheKey = `${CACHE_PREFIX}${date}`;
  const cachedRate = localStorage.getItem(cacheKey);
  
  if (cachedRate) {
    return parseFloat(cachedRate);
  }

  try {
    const response = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/eur/${date}/?format=json`);
    
    if (response.status === 404) {
      // If rate not found for this date, try previous working day
      const previousDay = getPreviousWorkingDay(date);
      return getExchangeRate(previousDay);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: NBPResponse = await response.json();
    const rate = data.rates[0].mid;
    
    // Cache the result
    localStorage.setItem(cacheKey, rate.toString());
    
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return null;
  }
} 