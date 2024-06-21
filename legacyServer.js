const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for CORS
app.use(cors());

// Step 1: Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  }
});

// Step 2: Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Server Working..');
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file Uploaded');
    }

    // Path to the uploaded file
    const inputFilePath = req.file.path;

    // Ensure the processed directory exists
    const outputDir = 'processed/';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a unique directory for each processed file
    const outputFileDir = `${outputDir}${Date.now()}`;
    if (!fs.existsSync(outputFileDir)) {
      fs.mkdirSync(outputFileDir);
    }

    // Define output file paths for different bitrates
    const outputFilePath64k = `${outputFileDir}/audio_64k.mp3`;
    const outputFilePath128k = `${outputFileDir}/audio_128k.mp3`;
    const outputFilePath320k = `${outputFileDir}/audio_320k.mp3`;

    // Function to transcode to a specific bitrate
    const transcodeToBitrate = (bitrate, outputFilePath) => {
      return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
          .audioBitrate(bitrate)
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(outputFilePath);
      });
  };

  // Transcode the audio to multiple bitrates
  Promise.all([
    transcodeToBitrate('64k', outputFilePath64k),
    transcodeToBitrate('128k', outputFilePath128k),
    transcodeToBitrate('320k', outputFilePath320k)
  ])
    .then(() => {
      res.status(200).json({
        message: 'File uploaded and processed successfully',
        files: {
          '64k': outputFilePath64k,
          '128k': outputFilePath128k,
          '320k': outputFilePath320k
        }
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error processing file.');
    });
});


/* app.get('/audio', (req, res) => {
  outputFileDir = 'processed/1718689425941'
  const outputFilePath64k = `${outputFileDir}/audio_64k.mp3`;
  res.send({'file': outputFilePath64k});
}) */

  app.get('/audio', (req, res) => {
    const outputFileDir = 'processed/1718689425941';
    const outputFilePath64k = path.join(__dirname, `${outputFileDir}/audio_64k.mp3`);
  
    fs.stat(outputFilePath64k, (err, stat) => {
      if (err) {
        res.status(404).send('File not found');
        return;
      }
      
      res.setHeader('Content-Type', 'audio/mp3');
      res.setHeader('Content-Length', stat.size);
      const readStream = fs.createReadStream(outputFilePath64k);
      readStream.pipe(res);
    });
  });




// Serve the processed audio files
app.use('/processed', express.static(path.join(__dirname, 'processed')));

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});

