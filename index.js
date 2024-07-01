const express = require('express')

const app = express();
const port = 3030;

app.use(express.static('public'));

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`);
});
