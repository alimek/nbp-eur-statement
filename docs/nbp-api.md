# API do pobrania danych na temat kursu waluty w danym dniu z NBP

HTTP GET na https://api.nbp.pl/api/exchangerates/rates/c/{CURRENCY}/{DATE}/?format=json

## CURRENCY:
- EUR

## DATE
Format daty musi byc YYYY-MM-DD

## Przykladowa odpowiedz API dla Euro w dniu 2025-02-21

```json
{
  "table": "C",
  "currency": "euro",
  "code": "EUR",
  "rates": [
    {
      "no": "036/C/NBP/2025",
      "effectiveDate": "2025-02-21",
      "bid": 4.1247,
      "ask": 4.2081
    }
  ]
}
```