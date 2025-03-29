import { prisma } from "./prisma"

// Function to perform similarity search
export async function similaritySearch(queryEmbedding: number[], matchThreshold = 0.7, matchCount = 5) {
	// Convert embedding array to Postgres vector format
	const embeddingStr = `[${queryEmbedding.join(",")}]`

	const result = await prisma.$queryRaw`
    SELECT 
      id,
      document_id as "documentId",
      content,
      metadata,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM document_embeddings
    WHERE 1 - (embedding <=> ${embeddingStr}::vector) > ${matchThreshold}
    ORDER BY similarity DESC
    LIMIT ${matchCount}
  `

	return result as {
		id: number
		documentId: string
		content: string
		metadata: any
		similarity: number
	}[]
}

// Function to get unique documents
export async function getUniqueDocuments() {
	const result = await prisma.$queryRaw`
    SELECT 
      DISTINCT ON (document_id) document_id as "documentId",
      metadata->>'title' as title,
      metadata->>'source' as source,
      MIN(created_at) as "createdAt",
      COUNT(*) as "chunkCount"
    FROM document_embeddings
    GROUP BY document_id, metadata->>'title', metadata->>'source'
    ORDER BY document_id
  `

	return result as {
		documentId: string
		title: string
		source: string
		createdAt: Date
		chunkCount: number
	}[]
}

// Function to store vector embedding
export async function storeEmbedding(
	documentId: string,
	chunkIndex: number,
	content: string,
	embedding: number[],
	metadata: any,
) {
	// Convert embedding array to Postgres vector format
	const embeddingStr = `[${embedding.join(",")}]`

	await prisma.$executeRaw`
    INSERT INTO document_embeddings (document_id, chunk_index, content, embedding, metadata)
    VALUES (${documentId}, ${chunkIndex}, ${content}, ${embeddingStr}::vector, ${JSON.stringify(metadata)}::jsonb)
  `
}

