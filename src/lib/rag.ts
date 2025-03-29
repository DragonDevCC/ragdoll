// This file handles the RAG (Retrieval Augmented Generation) functionality

import { generateText } from "ai"
import { mistral } from "@ai-sdk/mistral"
import { storeDocumentEmbeddings, searchDocuments } from "@/lib/vector-store"

// Type for question response
type QuestionResponse = {
	text: string
	sources?: {
		title: string
		page: number
		content: string
	}[]
}

// Function to ask a question using RAG
export async function askQuestion(question: string): Promise<QuestionResponse> {
	console.log(`Processing question: ${question}`)

	try {
		// Search for relevant document chunks
		const relevantChunks = await searchDocuments(question, 5)

		if (!relevantChunks || relevantChunks.length === 0) {
			return {
				text: "I couldn't find any relevant information in your documents to answer this question.",
			}
		}

		// Format the chunks as context
		const context = relevantChunks
			.map(
				(chunk) =>
					`Document: ${chunk.metadata.title}${chunk.metadata.page ? ` (Page ${chunk.metadata.page})` : ""}\nContent: ${chunk.content}`,
			)
			.join("\n\n")

		// Generate a response using Mistral and the retrieved context
		const { text } = await generateText({
			model: mistral("mistral-large-latest"),
			prompt: `
        You are an AI assistant that answers questions based on the provided document context.
        
        Context:
        ${context}
        
        Question: ${question}
        
        Answer the question based only on the provided context. If the context doesn't contain the information needed to answer the question, say so.
      `,
		})

		// Format sources for the UI
		const sources = relevantChunks.map((chunk) => ({
			title: chunk.metadata.title || "Unknown Document",
			page: chunk.metadata.page || null,
			content: chunk.content.substring(0, 150) + "...",
		}))

		return {
			text,
			sources,
		}
	} catch (error) {
		console.error("Error generating response:", error)
		throw new Error("Failed to generate response")
	}
}

// Function to implement OCR with Mistral
export async function processDocumentWithMistralOCR(fileUrl: string): Promise<string> {
	try {
		const { text } = await generateText({
			model: mistral("mistral-small-latest"),
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Extract all text content from this document.",
						},
						{
							type: "file",
							data: new URL(fileUrl),
							mimeType: "application/pdf",
						},
					],
				},
			],
			providerOptions: {
				mistral: {
					documentImageLimit: 20,
					documentPageLimit: 100,
				},
			},
		})

		return text
	} catch (error) {
		console.error("Error processing document with OCR:", error)
		throw new Error("Failed to process document with OCR")
	}
}

// Function to index a document for RAG
export async function indexDocumentForRAG(documentId: string, content: string, metadata: any): Promise<boolean> {
	try {
		console.log(`Indexing document ${documentId} for RAG...`)

		// Store document embeddings in vector database
		await storeDocumentEmbeddings(documentId, content, metadata)

		return true
	} catch (error) {
		console.error("Error indexing document:", error)
		throw error
	}
}

