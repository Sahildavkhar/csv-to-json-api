# CSV → JSON API (Node + Postgres)

## Summary
This Node.js Express app accepts a CSV upload, parses lines using a custom CSV parser (no CSV libs), converts dotted headers into nested JSON, and stores records into Postgres `public.users` table in batches. It then returns age-group distribution.

## Features
- Custom CSV parser (handles quoted fields & escaped quotes).  
- Streams file line-by-line (memory efficient).  
- Batch inserts to Postgres (`BATCH_SIZE` env var).  
- Computes age-group %: `<20`, `20-40`, `40-60`, `>60`.  

## Requirements
- Node 18+ (or Node 16+)  
- Postgres  
- npm  

## Setup
1. Copy `.env.example` to `.env` and fill DB values.  
2. Install dependencies:

   ```bash
   npm install
## Create DB table:
```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f migrate.sql
```

## Start server:
``npm start
``

Example using curl:
``curl -X POST -F "file=@sample_data/sample.csv" http://localhost:3000/upload
``

