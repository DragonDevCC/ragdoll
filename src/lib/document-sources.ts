// This file handles connections to document sources like SharePoint, OneDrive, etc.
import { prisma } from "./prisma"
import { createGraphClient } from "@/lib/microsoft-graph"
import { processDocumentWithMistralOCR, indexDocumentForRAG } from "@/lib/rag"

// Types
export type Document = {
	id: string
	name: string
	source: SourceId
	size: number
	lastModified: Date
	content?: Blob
	url?: string
}

export type SourceId = "sharepoint" | "onedrive" | "local" | "other"

// Function to connect to a document source
export async function connectToSource(sourceId: SourceId): Promise<boolean> {
	console.log(`Connecting to ${sourceId}...`)

	try {
		// Store connection state in database
		await prisma.documentSource.upsert({
			where: {
				sourceId,
			},
			update: {
				connected: true,
				lastConnected: new Date(),
			},
			create: {
				sourceId,
				connected: true,
				lastConnected: new Date(),
			},
		})

		return true
	} catch (error) {
		console.error(`Error connecting to ${sourceId}:`, error)
		return false
	}
}

// Get files from OneDrive for a specific user
export async function getUserOneDriveFiles(userId: string) {
	try {
		const client = createGraphClient()
		const response = await client.api(`/users/${userId}/drive/root/children`).get()
		return response.value
	} catch (error) {
		console.error("Error getting OneDrive files:", error)
		throw error
	}
}

// Get files from SharePoint site
export async function getSharePointFiles(siteId: string, libraryName = "Documents") {
	try {
		const client = createGraphClient()
		const response = await client.api(`/sites/${siteId}/drives`).get()

		// Find the document library
		const library = response.value.find((drive: any) => drive.name === libraryName)

		if (!library) {
			throw new Error(`Library "${libraryName}" not found`)
		}

		// Get files from the library
		const files = await client.api(`/drives/${library.id}/root/children`).get()
		return files.value
	} catch (error) {
		console.error("Error getting SharePoint files:", error)
		throw error
	}
}

// Download a file from OneDrive or SharePoint
export async function downloadFile(driveId: string, itemId: string): Promise<ArrayBuffer> {
	try {
		const client = createGraphClient()
		const response = await client.api(`/drives/${driveId}/items/${itemId}/content`).responseType("arraybuffer").get()

		return response
	} catch (error) {
		console.error("Error downloading file:", error)
		throw error
	}
}

// Process a file from OneDrive or SharePoint
export async function processRemoteFile(driveId: string, itemId: string, fileName: string): Promise<string> {
	try {
		// Download the file
		const fileContent = await downloadFile(driveId, itemId)

		// Get file metadata
		const client = createGraphClient()
		const metadata = await client.api(`/drives/${driveId}/items/${itemId}`).get()

		// Create a temporary URL for the file
		const buffer = Buffer.from(fileContent)
		const base64 = buffer.toString("base64")
		const mimeType = metadata.file.mimeType || "application/octet-stream"
		const tempUrl = `data:${mimeType};base64,${base64}`

		// Process with Mistral OCR
		const extractedText = await processDocumentWithMistralOCR(tempUrl)

		// Index for RAG
		const documentId = `${driveId}-${itemId}`
		await indexDocumentForRAG(documentId, extractedText, {
			title: fileName,
			source: "microsoft",
			driveId,
			itemId,
			mimeType,
		})

		return documentId
	} catch (error) {
		console.error("Error processing remote file:", error)
		throw error
	}
}

// Process a local file
export async function processLocalFile(file: File): Promise<string> {
	try {
		// Create a temporary URL for the file
		const arrayBuffer = await file.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)
		const base64 = buffer.toString("base64")
		const mimeType = file.type || "application/octet-stream"
		const tempUrl = `data:${mimeType};base64,${base64}`

		// Process with Mistral OCR
		const extractedText = await processDocumentWithMistralOCR(tempUrl)

		// Index for RAG
		const documentId = `local-${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, "-")}`
		await indexDocumentForRAG(documentId, extractedText, {
			title: file.name,
			source: "local",
			size: file.size,
			mimeType,
		})

		return documentId
	} catch (error) {
		console.error("Error processing local file:", error)
		throw error
	}
}

// List all SharePoint sites
export async function listSharePointSites() {
	try {
		const client = createGraphClient()
		const response = await client.api("/sites?search=*").get()
		return response.value
	} catch (error) {
		console.error("Error listing SharePoint sites:", error)
		throw error
	}
}

// Get folder contents
export async function getFolderContents(driveId: string, folderId: string) {
	try {
		const client = createGraphClient()
		let response

		if (folderId === "root") {
			response = await client.api(`/drives/${driveId}/root/children`).get()
		} else {
			response = await client.api(`/drives/${driveId}/items/${folderId}/children`).get()
		}

		return response.value
	} catch (error) {
		console.error("Error getting folder contents:", error)
		throw error
	}
}

// Get parent folder
export async function getParentFolder(driveId: string, folderId: string) {
	try {
		const client = createGraphClient()

		// Get the current folder to find its parent
		const folderResponse = await client.api(`/drives/${driveId}/items/${folderId}`).get()

		if (!folderResponse.parentReference || !folderResponse.parentReference.id) {
			throw new Error("Folder has no parent")
		}

		const parentId = folderResponse.parentReference.id

		// Get the contents of the parent folder
		const parentContentsResponse = await client.api(`/drives/${driveId}/items/${parentId}/children`).get()

		return {
			parentId,
			items: parentContentsResponse.value,
		}
	} catch (error) {
		console.error("Error getting parent folder:", error)
		throw error
	}
}

