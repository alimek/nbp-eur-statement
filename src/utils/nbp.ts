interface NBPResponse {
  rates: Array<{
    mid: number;
    effectiveDate: string;
  }>;
}

export async function getExchangeRate(date: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.nbp.pl/api/exchangerates/rates/a/EUR/${date}/?format=json`
    );
    
    if (!response.ok) {
      // If we get a 404 or any other error, try the previous working day
      if (response.status === 404) {
        const previousDay = getPreviousWorkingDay(date);
        console.log(`No rate for ${date}, trying ${previousDay}`);
        return getExchangeRate(previousDay);
      }
      console.error(`Failed to fetch exchange rate for ${date}`);
      return null;
    }

    const data: NBPResponse = await response.json();
    return data.rates[0].mid;
  } catch (error) {
    console.error(`Error fetching exchange rate for ${date}:`, error);
    return null;
  }
}

export function getPreviousWorkingDay(date: string): string {
  const currentDate = new Date(date);
  
  // Move to the previous day
  currentDate.setDate(currentDate.getDate() - 1);
  
  // Keep moving back until we find a working day (not Saturday or Sunday)
  while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Format the date as YYYY-MM-DD
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
} 