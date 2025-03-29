import { OpenAIEmbeddings } from "@langchain/openai"
import { storeEmbedding, similaritySearch, getUniqueDocuments } from "./vector-utils"
import { prisma } from "./prisma"

// Initialize embeddings model
const embeddings = new OpenAIEmbeddings({
	openAIApiKey: process.env.OPENAI_API_KEY,
})

// Store document embeddings
export async function storeDocumentEmbeddings(documentId: string, content: string, metadata: any) {
	// Split content into chunks
	const chunks = splitIntoChunks(content, 1000, 200)

	// Generate embeddings for each chunk
	for (const [index, chunk] of chunks.entries()) {
		const embeddingVector = await embeddings.embedQuery(chunk)

		// Store in database
		await storeEmbedding(documentId, index, chunk, embeddingVector, {
			...metadata,
			chunk_index: index,
		})
	}

	return chunks.length
}

// Search for relevant document chunks
export async function searchDocuments(query: string, limit = 5) {
	try {
		// Generate embedding for the query
		const embeddingVector = await embeddings.embedQuery(query)

		// Search for similar chunks
		const results = await similaritySearch(embeddingVector, 0.7, limit)

		return results
	} catch (error) {
		console.error("Error searching documents:", error)
		throw error
	}
}

// Helper function to split text into chunks
function splitIntoChunks(text: string, chunkSize: number, overlap: number) {
	const chunks = []
	let i = 0

	while (i < text.length) {
		const chunk = text.slice(i, i + chunkSize)
		chunks.push(chunk)
		i += chunkSize - overlap
	}

	return chunks
}

// Get document metadata
export async function getDocumentMetadata(documentId: string) {
	try {
		const result = await prisma.documentEmbedding.findFirst({
			where: {
				documentId,
			},
			select: {
				metadata: true,
			},
		})

		return result?.metadata || null
	} catch (error) {
		console.error("Error getting document metadata:", error)
		throw error
	}
}

// List all indexed documents
export async function listIndexedDocuments() {
	try {
		const documents = await getUniqueDocuments()
		return documents
	} catch (error) {
		console.error("Error listing documents:", error)
		throw error
	}
}

// Delete document and its embeddings
export async function deleteDocument(documentId: string) {
	try {
		await prisma.documentEmbedding.deleteMany({
			where: {
				documentId,
			},
		})

		return true
	} catch (error) {
		console.error("Error deleting document:", error)
		throw error
	}
}

