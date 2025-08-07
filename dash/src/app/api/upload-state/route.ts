import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

// Initialize GCS client
let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    const serviceAccount = process.env.GCP_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('GCP_SERVICE_ACCOUNT environment variable not set');
    }
    
    try {
      const credentials = JSON.parse(serviceAccount);
      storage = new Storage({
        projectId: credentials.project_id,
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
      });
    } catch {
      throw new Error('Invalid GCP_SERVICE_ACCOUNT JSON');
    }
  }
  
  return storage;
}

export async function POST(request: NextRequest) {
  try {
    // Get the state data from request body
    const state = await request.json();
    
    // Validate that we have state data
    if (!state || typeof state !== 'object') {
      return NextResponse.json(
        { error: 'Invalid state data' },
        { status: 400 }
      );
    }
    
    // Hard-coded bucket and file names
    const bucketName = 'ziyadedher';
    const fileName = 'catears.json';
    
    // Get the storage client
    const gcs = getStorage();
    const bucket = gcs.bucket(bucketName);
    const file = bucket.file(fileName);
    
    // Convert state to JSON string
    const stateJson = JSON.stringify(state, null, 2);
    
    // Upload to GCS with metadata
    await file.save(stateJson, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate',
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'catears-dashboard',
        },
      },
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'State uploaded successfully',
      timestamp: new Date().toISOString(),
      bucket: bucketName,
      file: fileName,
    });
    
  } catch (error) {
    console.error('Error uploading state to GCS:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('GCP_SERVICE_ACCOUNT')) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to upload state' },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to retrieve the current state
export async function GET() {
  try {
    const bucketName = 'ziyadedher';
    const fileName = 'catears.json';
    
    const gcs = getStorage();
    const bucket = gcs.bucket(bucketName);
    const file = bucket.file(fileName);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: 'State file not found' },
        { status: 404 }
      );
    }
    
    // Download the file
    const [contents] = await file.download();
    const state = JSON.parse(contents.toString());
    
    return NextResponse.json(state);
    
  } catch (error) {
    console.error('Error retrieving state from GCS:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve state' },
      { status: 500 }
    );
  }
}