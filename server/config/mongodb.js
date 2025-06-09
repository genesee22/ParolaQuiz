import mongoose from 'mongoose';

const connectMongoDB = async () => {
    mongoose.connection.on('connected', () => console.log('MongoDB Connected'));
    mongoose.connection.on('error', err => console.error('MongoDB Connection Error', err));

    await mongoose.connect(`${process.env.MONGODB_URI}/parolaquiz`);
};

export default connectMongoDB;