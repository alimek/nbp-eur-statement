# API do pobrania danych na temat kursu waluty w danym dniu z NBP

HTTP GET na https://api.nbp.pl/api/exchangerates/rates/a/{CURRENCY}/{DATE}/?format=json

## CURRENCY:
- EUR

## DATE
Format daty musi byc YYYY-MM-DD

## Przykladowa odpowiedz API dla Euro w dniu 2025-02-21

```json
{
  "table": "A",
  "currency": "euro",
  "code": "EUR",
  "rates": [
    {
      "effectiveDate": "2025-02-21",
      "mid": 4.1247,
    }
  ]
}
```