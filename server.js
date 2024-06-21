const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const Mongodb = require('./DBconnection');
const { mongo } = require('mongoose');

// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);




const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for CORS
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))
const coreOptions = {
    origin : '*',
    credentials : true,
    optionSuccessStatus : 200
}
app.use(cors(coreOptions))


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

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const inputFilePath = req.file.path;
  const fileName = req.file.originalname;
  const outputDir = `processed/${Date.now()}`; //path of transcoded files folder
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await createDashStream(inputFilePath, outputDir);
    await Mongodb.InsertFileData('6673fbe3a0cc94898198f3a1',fileName,outputDir);

    res.status(200).json({ message: 'File uploaded and processed successfully', outputDir });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing file.');
  }
});


//Creating Dash Function
async function createDashStream(inputFilePath, outputDir) {
  const bitrates = ['64k', '128k', '320k'];

  const ffmpegCmd = ffmpeg(inputFilePath);

  bitrates.forEach(bitrate => {
    ffmpegCmd
      .output(`${outputDir}/audio_${bitrate}.mpd`)
      .audioBitrate(bitrate)
      .format('dash')
      .outputOptions([
        '-map 0:a',
        '-f dash',
        '-seg_duration 2',
        `-init_seg_name init-${bitrate}.mp4`,
        `-media_seg_name segment-${bitrate}-$Number$.m4s`
      ]);
  });

  return new Promise((resolve, reject) => {
    ffmpegCmd
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}


/* 
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
  }); */


  //Fetching and sending DASH MDP file streaming audio 
  app.get('/audio', async(req, res) => {
    const bitrate = req.query.bitrate || '128k';
    const audioName = req.query.name;

    //console.log(`audioName at /audio : ${audioName}`)
    //console.log(`Bitrate at /audio : ${bitrate}`)
    try{
      //get the path of audio from DB by using UserId and audio Name
      const path = await Mongodb.audioPathByName('6673fbe3a0cc94898198f3a1',audioName)

      //const processedDir = path.join(__dirname, 'processed/1718769583899');
      
      console.log(path)

      //console.log('Requested bitrate:', bitrate);
      //console.log('Looking in directory:', processedDir);
    
      fs.readdir(path, (err, files) => {
        if (err) {
          console.error('Error reading processed directory:', err);
          return res.status(500).send('Error reading processed directory.');
        }
    
        //console.log('Files in processed directory:', files);
        const mpdFile = files.find(file => file.includes(`audio_${bitrate}.mpd`));
    
        if (!mpdFile) {
          console.error(`MPD file not found for bitrate ${bitrate}`);
          return res.status(404).send('MPD file not found.');
        }
        //sendong the transcoded MDP file path to the client respect to users network speed
        res.json({ mpdUrl: `/${path}/${mpdFile}` });
      });

    }
    catch(err){
      console.log(`Err From /audio route : ${err}`)
    }
  });


  //All Audios details sending route
  app.get('/allaudios', async (req, res) => {
    try{
      filesData = await Mongodb.retriveFilesData('6673fbe3a0cc94898198f3a1');
      console.log(filesData)
      res.json(filesData);
    }
    catch(err){
      console.log(`Err From allAudio route : ${err}`)
    }
  }) 
  


// Serve the processed audio files
app.use('/processed', express.static(path.join(__dirname, 'processed')));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
//MongoDB connection 
Mongodb.connectDB();





















/* const express = require('express');
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

  // Define the output file path and name
  const outputFilePath = `${outputDir}${Date.now()}.mp3`;

  // Use FFmpeg to transcode the audio file to MP3 format
  ffmpeg(inputFilePath)
    .toFormat('mp3')
    .on('end', () => {
      //res.status(200).json({ message: 'File uploaded and processed successfully', output: outputFilePath });
      res.status(200).json('File uploaded and processed successfully');
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).send('Error processing file.');
    })
    .save(outputFilePath);
});

app.use('/processed', express.static(path.join(__dirname, 'processed')));

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
 */