import { NextRequest, NextResponse } from 'next/server';
import { QdrantVectorStore } from '@langchain/qdrant';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeFile } from 'fs/promises';
import { 
  MEDICAL_REPORTS_CONFIG, 
  API_CONFIG,
  validateFileSize, 
  validateFileType, 
  sanitizeFileName,
  getErrorMessage,
  getSuccessMessage
} from '@/lib/medical-reports-config';
import {
  checkRateLimit,
  getClientIP,
  createErrorResponse,
  createSuccessResponse,
  validateEnvironment,
  logActivity,
  cleanupTempFile,
  generateSessionId
} from '@/lib/medical-reports-utils';

const QDRANT_URL = API_CONFIG.QDRANT_URL;
const QDRANT_API_KEY = API_CONFIG.QDRANT_API_KEY;

export async function POST(request: NextRequest) {
  const sessionId = generateSessionId();
  const clientIP = getClientIP(request);
  
  try {
    logActivity('upload_start', { sessionId, clientIP });
    
    // Rate limiting check
    if (!checkRateLimit(clientIP)) {
      logActivity('rate_limit_exceeded', { sessionId, clientIP }, 'warn');
      return createErrorResponse(
        getErrorMessage('RATE_LIMIT_EXCEEDED'),
        429
      );
    }
    
    // Environment validation
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      logActivity('environment_check_failed', { 
        sessionId, 
        missingVars: envCheck.missingVars 
      }, 'error');
      return createErrorResponse(
        getErrorMessage('NO_API_KEY'),
        500
      );
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      logActivity('no_file_provided', { sessionId }, 'warn');
      return createErrorResponse('No PDF file provided', 400);
    }

    // File validation
    if (!validateFileType(file.type)) {
      logActivity('invalid_file_type', { 
        sessionId, 
        fileType: file.type,
        fileName: file.name 
      }, 'warn');
      return createErrorResponse(
        getErrorMessage('INVALID_FILE_TYPE'),
        400
      );
    }

    if (!validateFileSize(file.size)) {
      logActivity('file_too_large', { 
        sessionId, 
        fileSize: file.size,
        fileName: file.name 
      }, 'warn');
      return createErrorResponse(
        getErrorMessage('FILE_TOO_LARGE'),
        400
      );
    }

    logActivity('file_validation_passed', { 
      sessionId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Create temporary file with sanitized name
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // Use OS temp directory which works in all environments including serverless
    const tempDir = os.tmpdir();
    const sanitizedFileName = sanitizeFileName(file.name);
    
    // No need to create temp directory - OS temp dir always exists
    const tempFilePath = path.join(tempDir, `medical-report-${sessionId}-${sanitizedFileName}`);
    logActivity('saving_temp_file', { sessionId, tempFilePath });
    await writeFile(tempFilePath, buffer);

    try {
      // Load and process PDF
      logActivity('loading_pdf', { sessionId });
      const loader = new PDFLoader(tempFilePath);
      const docs = await loader.load();
      
      if (docs.length === 0) {
        await cleanupTempFile(tempFilePath);
        return createErrorResponse(
          getErrorMessage('NO_CONTENT'),
          400
        );
      }

      logActivity('pdf_loaded', { 
        sessionId, 
        documentCount: docs.length,
        totalCharacters: docs.reduce((sum, doc) => sum + doc.pageContent.length, 0)
      });

      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: MEDICAL_REPORTS_CONFIG.CHUNK_SIZE,
        chunkOverlap: MEDICAL_REPORTS_CONFIG.CHUNK_OVERLAP,
      });
      const splitDocs = await textSplitter.splitDocuments(docs);
      
      // Limit number of chunks for performance
      const limitedDocs = splitDocs.slice(0, MEDICAL_REPORTS_CONFIG.MAX_CHUNKS_PER_DOCUMENT);
      
      logActivity('documents_split', { 
        sessionId, 
        totalChunks: splitDocs.length,
        processedChunks: limitedDocs.length
      });

      // Initialize Qdrant client with production configuration
      logActivity('initializing_qdrant', { sessionId });
      const clientConfig: any = {
        url: QDRANT_URL,
      };
      
      if (QDRANT_API_KEY) {
        clientConfig.apiKey = QDRANT_API_KEY;
      }
      
      // For cloud instances, ensure proper HTTPS handling
      if (QDRANT_URL.includes('cloud.qdrant.io')) {
        clientConfig.https = true;
      }
      
      const client = new QdrantClient(clientConfig);

      // Check if collection exists, create if not
      logActivity('checking_collection', { sessionId });
      try {
        await client.getCollection(MEDICAL_REPORTS_CONFIG.COLLECTION_NAME);
        logActivity('collection_exists', { sessionId });
      } catch (error) {
        logActivity('creating_collection', { sessionId });
        await client.createCollection(MEDICAL_REPORTS_CONFIG.COLLECTION_NAME, {
          vectors: {
            size: MEDICAL_REPORTS_CONFIG.VECTOR_DIMENSION,
            distance: MEDICAL_REPORTS_CONFIG.DISTANCE_METRIC,
          },
        });
      }

      // Clear existing documents for this session (optional - you might want to keep them)
      logActivity('clearing_existing_documents', { sessionId });
      try {
        await client.delete(MEDICAL_REPORTS_CONFIG.COLLECTION_NAME, {
          filter: {},
        });
      } catch (error) {
        logActivity('no_existing_documents', { sessionId });
      }

      // Initialize embeddings with production configuration
      logActivity('initializing_embeddings', { sessionId });
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: API_CONFIG.GOOGLE_API_KEY,
        modelName: MEDICAL_REPORTS_CONFIG.EMBEDDING_MODEL,
      });

      // Test embedding generation before processing all documents
      logActivity('testing_embedding_generation', { sessionId });
      try {
        const testText = limitedDocs[0]?.pageContent.substring(0, 100) || "Test medical document";
        const testEmbedding = await embeddings.embedQuery(testText);
        
        if (!testEmbedding || testEmbedding.length === 0) {
          throw new Error('Embedding generation returned empty vector');
        }
        
        if (testEmbedding.length !== 768) {
          throw new Error(`Embedding dimension mismatch: expected 768, got ${testEmbedding.length}`);
        }
        
        logActivity('embedding_test_successful', { 
          sessionId, 
          dimensions: testEmbedding.length 
        });
      } catch (embeddingTestError) {
        await cleanupTempFile(tempFilePath);
        
        if (embeddingTestError instanceof Error && embeddingTestError.message.includes('quota')) {
          logActivity('quota_exceeded', { sessionId }, 'error');
          return createErrorResponse(
            'API quota exceeded. Please check your Google Cloud billing and quota limits for the Generative AI API.',
            429,
            'The Google API key has reached its quota limit for embedding requests. Please upgrade your quota or try again later.'
          );
        } else if (embeddingTestError instanceof Error && embeddingTestError.message.includes('INVALID_ARGUMENT')) {
          logActivity('invalid_api_key', { sessionId }, 'error');
          return createErrorResponse(
            'Invalid API key. Please check your Google API key configuration.',
            401,
            'The Google API key appears to be invalid or disabled.'
          );
        } else {
          logActivity('embedding_generation_failed', { 
            sessionId, 
            error: embeddingTestError instanceof Error ? embeddingTestError.message : 'Unknown error'
          }, 'error');
          return createErrorResponse(
            'Failed to generate embeddings. Please check your API configuration.',
            500,
            embeddingTestError instanceof Error ? embeddingTestError.message : 'Unknown error'
          );
        }
      }

      // Create vector store and add documents
      logActivity('creating_vector_store', { sessionId });
      const vectorStore = new QdrantVectorStore(embeddings, {
        client,
        collectionName: MEDICAL_REPORTS_CONFIG.COLLECTION_NAME,
      });

      try {
        await vectorStore.addDocuments(limitedDocs);
        logActivity('documents_added_to_vector_store', { 
          sessionId, 
          documentsAdded: limitedDocs.length 
        });
      } catch (embeddingError) {
        if (embeddingError instanceof Error && embeddingError.message.includes('quota')) {
          logActivity('quota_exceeded', { sessionId }, 'error');
          await cleanupTempFile(tempFilePath);
          return createErrorResponse(
            'API quota exceeded. Please check your Google Cloud billing and quota limits for the Generative AI API.',
            429,
            'The Google API key has reached its quota limit for embedding requests. Please upgrade your quota or try again later.'
          );
        } else if (embeddingError instanceof Error && embeddingError.message.includes('dimension')) {
          logActivity('dimension_error', { sessionId }, 'error');
          await cleanupTempFile(tempFilePath);
          return createErrorResponse(
            'Vector dimension error. This usually indicates an API quota or configuration issue.',
            500,
            'The embedding generation is not working properly. Please check your API quota and configuration.'
          );
        } else if (embeddingError instanceof Error && embeddingError.message.includes('INVALID_ARGUMENT')) {
          logActivity('invalid_api_key', { sessionId }, 'error');
          await cleanupTempFile(tempFilePath);
          return createErrorResponse(
            'Invalid API key. Please check your Google API key configuration.',
            401,
            'The Google API key appears to be invalid or disabled.'
          );
        }
        // Re-throw other errors to be handled by outer catch
        throw embeddingError;
      }

      // Clean up temporary file
      await cleanupTempFile(tempFilePath);

      return createSuccessResponse({
        documentsProcessed: limitedDocs.length,
        sessionId,
      }, getSuccessMessage('UPLOAD_SUCCESS'));

    } catch (processingError) {
      // Clean up temporary file on error
      await cleanupTempFile(tempFilePath);
      
      logActivity('processing_error', { 
        sessionId, 
        error: processingError instanceof Error ? processingError.message : 'Unknown error' 
      }, 'error');
      
      return createErrorResponse(
        getErrorMessage('PROCESSING_FAILED'),
        500,
        processingError instanceof Error ? processingError.message : undefined
      );
    }

  } catch (error) {
    logActivity('general_error', { 
      sessionId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 'error');
    
    return createErrorResponse(
      getErrorMessage('PROCESSING_FAILED'),
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}
