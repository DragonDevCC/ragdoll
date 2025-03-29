import { type NextRequest, NextResponse } from "next/server"
import { processLocalFile } from "@/lib/document-sources"

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get("file") as File

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 })
		}

		// Check file type
		const allowedTypes = [
			"application/pdf",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"image/jpeg",
			"image/png",
		]

		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
		}

		// Process the file
		const documentId = await processLocalFile(file)

		return NextResponse.json({
			success: true,
			documentId,
			fileName: file.name,
			size: file.size,
		})
	} catch (error: any) {
		console.error("Error processing upload:", error)
		return NextResponse.json({ error: error.message || "Failed to process upload" }, { status: 500 })
	}
}

