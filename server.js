const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const documentRoutes = require('./routes/documentRoutes');


dotenv.config();

const app = express();


connectDB();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', documentRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});