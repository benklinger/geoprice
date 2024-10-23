const express = require('express');
const cors = require('cors');
const axios = require('axios');
const zlib = require('zlib');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const port = 5001;  // Updated port number

app.use(cors());

// Endpoint to get stores with coordinates
app.get('/stores-with-coords', (req, res) => {
    const results = [];

    fs.createReadStream('stores.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            res.json(results);
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            res.status(500).json({ error: 'Failed to read stores.csv' });
        });
});

// Endpoint to fetch items for a specific store
app.get('/items/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const now = new Date();
        const dateStr = now.toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD

        const itemsUrl = `https://prices.mega.co.il/${dateStr}/PriceFull7290055700007-${storeId}-${dateStr}0510.gz`;
		console.log(`Fetching items from URL: ${itemsUrl}`);
        const response = await axios.get(itemsUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*',
                'Referer': 'https://prices.mega.co.il/',
            }
        });

        // Decompress the gzipped content
        const decompressedData = zlib.gunzipSync(response.data);

        res.set('Content-Type', 'application/xml');
        res.send(decompressedData);
    } catch (error) {
        console.error('Error fetching items:', error.message);

        if (error.response) {
            console.error('Status code:', error.response.status);
            console.error('Response headers:', error.response.headers);
            console.error('Response data:', error.response.data.toString('utf8'));
            res.status(error.response.status).json({ error: error.message });
        } else if (error.request) {
            console.error('No response received:', error.request);
            res.status(500).json({ error: 'No response received from external server' });
        } else {
            console.error('Error', error.message);
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});