require('dotenv').config();
const mongoose = require('mongoose');

//Connecting to the DB using async functions
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MongoDB_URI,{});
            
        console.log(`MongoDB Connected`);
        //MongoDB connection 
       /*  collection(); */
        /* await collection(); */
       // savefile(); //auto creating the 
    } catch (err) {
        console.error(`MongoDB connection error: ${err}`);
    }
};


//listing all the Schemas in the DB test
const listallColl = async () => {
    try {
        // Ensure the connection is established
        if (!mongoose.connection.readyState) {
          throw new Error('Mongoose connection is not established');
        }
    
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:');
        collections.forEach(collection => {
          console.log(collection.name);
        });
        return collections;
      } catch (err) {
        console.error('Error listing collections:', err);
      }
};


//connecto to collection
/* const collection = async () => {
    try{
        const collection = mongoose.collection('sample_mflix');

        const movies = await collection.find({}).toArray(); // Query the collection
        console.log('Movies:', movies);
    }
    catch(err){
        console.log(`Error from Collection Method : ${err}`)
    }
} */

 //Users Schema 
 const userSchema = new mongoose.Schema({
    name : {type:String,required:true},
    mail : {type:String,required:true,unique:true},
    password : {type:String, required:true,},

 })

 //Creating a user Model
 const users = new mongoose.model('users', userSchema); //here 'users' is the collection name in the DB 'Streaming'

 //Inserting data
 const userData = new users({
    name :'Mani',
    mail : 'mani@gmail.com',
    password : 'Mani123',
 })


//Files collection schema
const fileSchema = new mongoose.Schema({
    user_id : {type:mongoose.Schema.Types.ObjectId, ref:'users', required:true},
    filesArr : [
            {
                filename : {type:String, required:true, unique:true},
                path : {type:String, required:true,},
            }
        ]
})

//creating fileSchema model
const filesModel = new mongoose.model('files', fileSchema);

//Creating data for files model


let user_id;

 //saving the data into the DB when user sign up for the first time
 const savefile = async() => {
    try{
        const userRes = await userData.save();
        console.log(userRes._id)
        user_id = userRes._id;

        // Create a new file record for the user with an empty files array
        const fileData = new filesModel({
            user_id: user_id,
            files: []
        });

        const fileRes = await fileData.save();

       console.log(fileRes)


    }
    catch(err){
        console.log(`Err from Saving File : ${err}`)
        //retriveAllFiles(user_id)
        //InsertFileData(fileData,user_id)
    }
 }

//Retriving ALL files from the 'files' collection documents with respect to users Id
const retriveAllFiles = async (user_id) => {
    try{
        const fileRes = await filesModel.find({ user_id: user_id }).populate('user_id').exec();
        //console.log(`Files Retrived : ${fileRes}`)
        return fileRes;
    }
    catch(err){
        console.log(`Err from retivingAllFiles : ${err}`)
    }
}

//Retriving only filesArr instead of whole data inside the file
const retriveFilesData = async (user_id) => {
    try {
        const fileRes = await filesModel.find({ user_id }).select('filesArr').exec();
        return fileRes.map(doc => doc.filesArr); // Extract the filesArr arrays from the result
    } catch (error) {
        console.error('Error retrieving files:', error);
        throw error;
    }
};

//Retrive Path of a Audio by Audio Name 
const audioPathByName = async(user_id,audioName) => {
    try{
        const fileRes = await filesModel.findOne(
            { user_id, 'filesArr.filename': audioName },
            { 'filesArr.$': 1 }
          ).exec();
      
          if (fileRes && fileRes.filesArr && fileRes.filesArr.length > 0) {
            const filePath = fileRes.filesArr[0].path;
            //console.log(`File path: ${filePath}`);
            return filePath;
          } else {
            console.log('File not found');
            return null;
          }
    }
    catch(err){
        console.log(`Err from audioPathByName : ${err}`)
    }
}



//Inserting data into the 'files' Array using user_id
const InsertFileData = async ( user_id,fileName,folderpath) => {

    const fileData =({
        filename:fileName,
        path: folderpath,
    })

    const userFiles = await filesModel.findOne({ user_id: user_id });
    userFiles.filesArr.push(fileData);
    await userFiles.save();
    console.log('File added successfully:', userFiles);
}

//Creating inserting arrayfiles data
/* const fileData =({
    filename:'filename2.mp3',
    path: 'uploads/filename2.mp3',
}) */


module.exports = { 
    connectDB, 
    listallColl,
    retriveAllFiles,
    retriveFilesData,
    audioPathByName,
    InsertFileData,
};