import {NextResponse} from "next/server"
import {prisma} from "@/lib/prisma"

export async function POST() {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "This endpoint is only available in development" }, { status: 403 })
	}

	try {
		// Create pgvector extension if it doesn't exist
		await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`

		// Create index for similarity search
		await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
      ON document_embeddings 
      USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error("Error initializing database:", error)
		return NextResponse.json({ error: error.message || "Failed to initialize database" }, { status: 500 })
	}
}

