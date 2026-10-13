import 'server-only';
import { MongoClient, type Db, GridFSBucket } from 'mongodb';

declare global {
  var cars21MongoClientPromise: Promise<MongoClient> | undefined;
}
let productionClientPromise: Promise<MongoClient> | undefined;

function connectMongo(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required for server-side database access.');
  return new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 7_000,
  }).connect();
}

async function getClient() {
  if (process.env.NODE_ENV === 'production') {
    productionClientPromise ??= connectMongo();
    return productionClientPromise;
  }
  globalThis.cars21MongoClientPromise ??= connectMongo();
  return globalThis.cars21MongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DATABASE || 'cars21');
}

export async function getPhotoBucket() {
  return new GridFSBucket(await getDb(), { bucketName: 'carPhotos' });
}
