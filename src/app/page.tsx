'use client';

import { useState, ChangeEvent } from 'react';
import Papa, { ParseResult } from 'papaparse';
import { getExchangeRate, getPreviousWorkingDay } from '../utils/nbp';

interface StatementEntry {
  'Completed Date': string;
  'Product name': string;
  'Description': string;
  'Interest rate (p.a.)': string;
  'Money out': string;
  'Money in': string;
  'Balance': string;
  'PLN Value'?: string;
}

interface EnhancedStatementEntry extends StatementEntry {
  exchangeRate?: number;
  nbpDate?: string;
  profit?: number;
}

const MONTHS: { [key: string]: string } = {
  'Jan': '01',
  'Feb': '02',
  'Mar': '03',
  'Apr': '04',
  'May': '05',
  'Jun': '06',
  'Jul': '07',
  'Aug': '08',
  'Sep': '09',
  'Oct': '10',
  'Nov': '11',
  'Dec': '12'
};

function parseDate(dateStr: string): Date {
  // Parse date in format "1 Jan 2024"
  const [day, month, year] = dateStr.split(' ');
  const monthNum = MONTHS[month];
  const paddedDay = day.padStart(2, '0');
  return new Date(`${year}-${monthNum}-${paddedDay}`);
}

function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compareDates(a: string, b: string): number {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  return dateA.getTime() - dateB.getTime();
}

export default function Home() {
  const [data, setData] = useState<EnhancedStatementEntry[]>([]);
  const [sortField, setSortField] = useState<keyof StatementEntry>('Completed Date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  const processCSVData = async (results: ParseResult<StatementEntry>) => {
    try {
      console.log('Parsed CSV data:', results.data);
      
      const enhancedData: EnhancedStatementEntry[] = [];
      let totalProfitSum = 0;
      
      // Process entries in chunks to handle rate limiting
      const CHUNK_SIZE = 50; // Process 50 entries at a time
      const interestEntries = results.data.filter(entry => entry.Description?.includes('Gross interest'));
      
      for (let i = 0; i < interestEntries.length; i += CHUNK_SIZE) {
        const chunk = interestEntries.slice(i, i + CHUNK_SIZE);
        
        // Process chunk with delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await Promise.all(chunk.map(async (entry) => {
          const enhancedEntry: EnhancedStatementEntry = { ...entry };
          const date = entry['Completed Date'];
          
          if (date) {
            const parsedDate = parseDate(date);
            const formattedDate = formatDateForAPI(parsedDate);
            const previousWorkingDay = getPreviousWorkingDay(formattedDate);
            const rate = await getExchangeRate(previousWorkingDay);
            
            if (rate && entry['Money in']) {
              const eurValue = parseFloat(entry['Money in'].replace('€', '').replace(',', ''));
              enhancedEntry.exchangeRate = rate;
              enhancedEntry.profit = eurValue * rate;
              enhancedEntry.nbpDate = previousWorkingDay;
              totalProfitSum += enhancedEntry.profit;
            }
          }
          
          enhancedData.push(enhancedEntry);
        }));
      }
      
      // Add non-interest entries
      const nonInterestEntries = results.data.filter(entry => !entry.Description?.includes('Gross interest'));
      enhancedData.push(...nonInterestEntries);
      
      // Sort data chronologically by default
      const sortedData = enhancedData.sort((a, b) => 
        compareDates(a['Completed Date'], b['Completed Date'])
      );
      
      setData(sortedData);
      setTotalProfit(totalProfitSum);
      setLoading(false);
    } catch (err: unknown) {
      console.error('Error processing data:', err);
      setError(err instanceof Error ? err.message : 'Error processing data');
      setLoading(false);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      Papa.parse<StatementEntry>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: processCSVData,
        error: (error: Error) => {
          console.error('CSV parsing error:', error);
          setError(`CSV parsing error: ${error.message}`);
          setLoading(false);
        }
      });
    };
    reader.onerror = () => {
      setError('Error reading file');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleSort = (field: keyof StatementEntry) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (sortField === 'Completed Date') {
      const compareResult = compareDates(a[sortField], b[sortField]);
      return sortDirection === 'asc' ? compareResult : -compareResult;
    }
    
    if (sortField === 'Money in' || sortField === 'Money out' || sortField === 'Balance') {
      const valueA = parseFloat((a[sortField] || '0').replace('€', '').replace(',', '')) || 0;
      const valueB = parseFloat((b[sortField] || '0').replace('€', '').replace(',', '')) || 0;
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }

    if (sortDirection === 'asc') {
      return (a[sortField] ?? '') > (b[sortField] ?? '') ? 1 : -1;
    }
    return (a[sortField] ?? '') < (b[sortField] ?? '') ? 1 : -1;
  });

  const handleExportCSV = () => {
    const exportData = sortedData.map(entry => ({
      'Date': entry['Completed Date'],
      'Product': entry['Product name'],
      'Description': entry['Description'],
      'Interest Rate': entry['Interest rate (p.a.)'],
      'Money Out': entry['Money out'],
      'Money In': entry['Money in'],
      'Balance': entry['Balance'],
      'NBP Date': entry.nbpDate || '',
      'Exchange Rate': entry.exchangeRate?.toFixed(4) || '',
      'Profit PLN': entry.profit?.toFixed(2) || ''
    }));

    // Add total profit as the last row
    exportData.push({
      'Date': '',
      'Product': '',
      'Description': '',
      'Interest Rate': '',
      'Money Out': '',
      'Money In': '',
      'Balance': '',
      'NBP Date': '',
      'Exchange Rate': 'Total Profit:',
      'Profit PLN': totalProfit.toFixed(2)
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'eur-statement-with-pln.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <main className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="text-xl text-red-600">Error: {error}</div>
          <label className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">EUR Statement</h1>
        <div className="flex gap-4">
          <label className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {data.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Export to CSV
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-xl">Processing data...</div>
        </div>
      ) : data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Completed Date')}
                >
                  Date {sortField === 'Completed Date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Product name')}
                >
                  Product {sortField === 'Product name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Description')}
                >
                  Description {sortField === 'Description' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Interest rate (p.a.)')}
                >
                  Interest Rate {sortField === 'Interest rate (p.a.)' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Money out')}
                >
                  Money Out {sortField === 'Money out' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Money in')}
                >
                  Money In {sortField === 'Money in' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('Balance')}
                >
                  Balance {sortField === 'Balance' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-2">
                  NBP Date
                </th>
                <th className="px-4 py-2">
                  Exchange Rate
                </th>
                <th className="px-4 py-2">
                  Profit PLN
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((entry, index) => (
                <tr 
                  key={index}
                  className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
                >
                  <td className="px-4 py-2 border-t">{entry['Completed Date']}</td>
                  <td className="px-4 py-2 border-t">{entry['Product name']}</td>
                  <td className="px-4 py-2 border-t whitespace-pre-line">{entry['Description']}</td>
                  <td className="px-4 py-2 border-t text-right">{entry['Interest rate (p.a.)']}</td>
                  <td className="px-4 py-2 border-t text-right text-red-600">{entry['Money out']}</td>
                  <td className="px-4 py-2 border-t text-right text-green-600">{entry['Money in']}</td>
                  <td className="px-4 py-2 border-t text-right font-medium">{entry['Balance']}</td>
                  <td className="px-4 py-2 border-t text-right">{entry.nbpDate || '-'}</td>
                  <td className="px-4 py-2 border-t text-right">
                    {entry.exchangeRate?.toFixed(4) || '-'}
                  </td>
                  <td className="px-4 py-2 border-t text-right font-medium">
                    {entry.profit ? `${entry.profit.toFixed(2)} PLN` : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={9} className="px-4 py-2 text-right">Total Profit:</td>
                <td className="px-4 py-2 text-right">{totalProfit.toFixed(2)} PLN</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-xl text-gray-500">Upload a CSV file to start</div>
        </div>
      )}
    </main>
  );
}
